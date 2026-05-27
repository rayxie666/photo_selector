## Context

现有架构是纯前端 React + Canvas 像素分析，所有处理在浏览器内完成。引入 AI 能力后，浏览器内推理（transformers.js）虽然零安装但首次加载体积大、对 RAW 处理弱、模型生态受限。因此本次重构选择**前后端分离**：前端继续负责 UI 与交互，新增 Python 后端承载所有 AI/LLM/RAW 处理工作，二者通过本地 HTTP/WebSocket 通信。

照片选片的实际工作流是**漏斗式**的：先剔技术废片（确定性强、能批量自动），再剔审美弱片（主观但可借助 AI 排序大幅缩小范围），最后在相似组里做关键性的二选一（必须人参与）。原架构的扁平 `isFlagged` 模型无法表达这个流程，状态机重构是必然。

## Goals / Non-Goals

**Goals:**
- 用本地 Python 后端承载所有 AI 推理与 LLM 路由，前端保持纯展示/交互
- 提供统一的 LLM Provider 抽象，新增/切换厂商成本最低
- 复用用户已有的 `claude` CLI，提供"零配置"的 Claude 选项
- 照片状态机软淘汰 + 任意阶段可恢复，决策永远可逆
- PK 对比的同步缩放/平移帧率达到 60fps（4K 图像）

**Non-Goals:**
- 不做后端的鉴权、限流、多用户隔离（本地单用户场景）
- 不做模型微调或在线学习
- 不做云端持久化或同步
- 不在浏览器内做模型推理（避免双重维护）

## Decisions

### 1. 后端框架：FastAPI + uv
**决策**：用 FastAPI 作为 Web 框架，用 `uv` 管理 Python 依赖与虚拟环境。
**原因**：FastAPI 异步原生、自带 OpenAPI 文档（前端可生成 TS client）、Python ML 生态完整。`uv` 比 `poetry/pip` 显著更快，单文件 `pyproject.toml` 配置简单。
**替代方案**：Flask（同步）→ 长任务阻塞，放弃；Django → 太重，放弃。

### 2. 进程模型：手动启动 + Vite proxy
**决策**：开发期用户手动启动后端（`uv run uvicorn app.main:app --reload`），前端 Vite 配置 `/api` proxy 到 `http://localhost:8000`。
**原因**：避免引入 Tauri/Electron 等打包复杂度；前后端各自独立调试、热重载。
**替代方案**：前端 spawn 子进程 → 浏览器环境做不到；将来若打包桌面应用再切换。

### 3. LLM Provider 抽象
**决策**：定义 `LLMProvider` Protocol（`async def score_aesthetic(image, prompt) -> ScoreResult` 等），每家 SDK 一个实现类（`OpenAIProvider` / `AnthropicProvider` / `GoogleProvider` / `ClaudeCodeCLIProvider`）。运行期根据请求 header 中的 `X-LLM-Provider` 选择。
**原因**：策略模式，新增厂商只写一个类；测试时可注入 mock。
**替代方案**：直接 if/else 分发 → 代码膨胀，放弃；LiteLLM 之类的统一库 → 多一层依赖且不支持 Claude Code CLI，放弃。

### 4. Claude Code CLI 集成
**决策**：`ClaudeCodeCLIProvider` 通过 `asyncio.create_subprocess_exec('claude', '-p', prompt, '--output-format', 'json', ...)` 调用本地 CLI，将图像 base64 化嵌入 prompt 或通过临时文件路径传入。
**原因**：用户已有 Claude Code 订阅 → 零 API Key 成本；且本地 CLI 已处理好认证、配额、模型选择。
**风险**：
- CLI 不在 PATH 时启动失败 → 健康检查 endpoint 探测，前端 settings 中明确标记可用性
- CLI 输出格式将来可能变 → 用 `--output-format json` 锁定结构；版本不匹配时降级提示
- 单次调用启动开销大（冷启动 1-2s）→ 仅用于 Top-N 文字点评，不用于全量打分

### 5. 美学评分：本地粗排 + LLM 精排
**决策**：
- **粗排**：本地 NIMA（或 LAION-Aesthetic-Predictor，二选一基于精度/速度评估，初版用 LAION 因为更轻量）给所有 Stage 1 通过的照片打分，O(n)
- **精排**：用户可选对 Top-K（默认 20）调用 LLM，要求返回结构化 JSON 包含 `score, composition_comment, style_comment, suggestion`
**原因**：本地模型廉价快速但无法解释；LLM 慢且贵但能给文字反馈。两者结合性价比最高。
**替代方案**：全程 LLM → 1000 张照片要数百元 token，放弃；全程本地 → 没有可解释性，用户体验差。

### 6. 相似度聚类：CLIP + DBSCAN
**决策**：
- 用 `open_clip` 的 ViT-B/32 给所有 Stage 2 通过的照片生成 512-d embedding
- 用 `sklearn.cluster.DBSCAN(eps=0.15, min_samples=2, metric='cosine')` 聚类
- 单元素簇（独立照片）直接晋级 finalist，多元素簇进入 PK 阶段
**原因**：DBSCAN 不需要预设簇数（用户连拍组大小不固定），cosine 距离匹配 CLIP embedding 的语义。
**替代方案**：感知哈希 pHash → 只能找几乎相同的图，连拍中拍摄角度微变就识别不出，放弃；硬阈值（cosine > 0.9）→ 不如 DBSCAN 鲁棒；ViT-L/14 → 慢 3x，初版用 B/32。

### 7. PK 同步缩放：双 Canvas + 共享 transform
**决策**：
- 两个 `<canvas>` 通过 `requestAnimationFrame` 渲染，共享一个 `{scale, offsetX, offsetY}` 状态
- 监听 wheel（缩放）、pointer down/move/up（平移）事件，事件源不限于哪一画布，状态变化触发两画布重绘
- 用 `OffscreenCanvas` + Worker 解码大图（4K+ 时）避免主线程卡顿
**原因**：DOM `<img>` + CSS transform 在 4K 图上 GPU 合成会卡帧；Canvas 可控、可做 mipmap、可硬件加速。
**替代方案**：Pixi.js / Konva → 引入重型依赖；CSS transform → 4K 上明显掉帧，放弃。

### 8. 照片状态机
**决策**：
```
Photo.status: 'pending' | 'rejected_tech' | 'rejected_ai' | 'rejected_pk' | 'finalist'
Photo.rejectionReason?: string  // e.g., 'overexposed', 'low_aesthetic_score', 'lost_pk_to:photoId'
```
所有"删除"操作只改 `status`，不删数据；"恢复"操作改回 `pending` 或前一阶段。
**原因**：状态可解释 + 可回溯，UI 可按状态过滤。
**替代方案**：保留 `isFlagged` 加多个 bool → 状态组合爆炸，放弃。

### 9. API Key 存储
**决策**：API Key 仅存浏览器 `localStorage`，每次请求时通过 `Authorization` header 转发到本地后端；后端**不**持久化，处理完即丢弃。
**原因**：本地后端无加密存储基础设施；用户清浏览器即清 Key；最小权限。
**风险**：localStorage 可被同源 XSS 读取 → 项目无第三方脚本，风险低；明确文档化即可。

### 10. 阶段并行 vs 串行
**决策**：三阶段必须串行，但每阶段内**批处理并行**（asyncio + 线程池处理 GPU 任务）。
**原因**：Stage 2 依赖 Stage 1 结果（只对未淘汰照片打分），Stage 3 依赖 Stage 2 排序后的 Top-K。阶段内可并行加速。

## Risks / Trade-offs

- **后端环境配置门槛**：用户需装 Python + uv + 首次下载模型权重。缓解：README 一键脚本 `./scripts/setup.sh`；模型权重下载加进度提示。
- **GPU 可选性**：CLIP/NIMA 在 CPU 也能跑但慢 5-10x。缓解：默认 CPU；检测到 CUDA/MPS 自动用；不强求 GPU。
- **Claude Code CLI 版本漂移**：用 `claude --version` 检测，<某版本时降级到提示。
- **LLM 成本失控**：默认精排 Top-K=20，用户可调；UI 显示预估 token 消耗。
- **PK 阶段用户疲劳**：连拍组很多时人会累。缓解：每组先用 AI 推荐一张并标注理由，用户可一键采纳或手动覆盖。
- **状态机迁移**：已有用户的 PhotoContext 内存数据不持久化，无需迁移；如果将来加 IndexedDB 持久化再设计迁移脚本。
- **同步缩放在低端机性能**：4K 图 + 软解码可能掉帧。缓解：检测设备性能动态降级到 2K 缩略图对比。

## Migration Plan

按"先后端骨架→流水线骨架→单阶段→对比 UI→收尾"五波：

1. **后端骨架**（无 AI）：FastAPI hello-world + uv 项目 + Vite proxy + 健康检查端点 + 前端 API client 雏形
2. **状态机重构**（前端独立）：Photo 状态机迁移；所有现有 UI 切换到按 `status` 渲染；删除/恢复改走状态变更
3. **Stage 1 迁移**：现有 imageAnalysis.ts 包装为 Stage 1，结果写入 `status = 'rejected_tech'`；UI 加阶段进度条
4. **Stage 2 - 后端美学**：后端加 NIMA/LAION 服务 + LLM 路由层（先实现 OpenAI 一家）+ 前端触发与展示
5. **Stage 2 - 多 Provider**：补 Anthropic / Google / Claude Code CLI，UI 加 provider 选择
6. **Stage 3 - 聚类**：后端加 CLIP + DBSCAN，前端展示分组结果
7. **Stage 3 - PK UI**：双 Canvas 同步缩放，锦标赛逻辑
8. **下载 + 恢复**：finalists 一键下载 + 按阶段一键恢复
9. **i18n + 文档**

每波结束都可独立可用，不强求一次性合并。
