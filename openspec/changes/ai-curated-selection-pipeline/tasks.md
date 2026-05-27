## 1. 后端项目骨架

- [x] 1.1 在仓库根新建 `backend/` 目录，用 `uv init` 创建 `pyproject.toml`（Python ≥ 3.11）
- [x] 1.2 在 `backend/pyproject.toml` 加入轻量 Web 依赖（fastapi、uvicorn[standard]、pydantic-settings、python-multipart）；ML/LLM 重型依赖（torch、open-clip、openai、anthropic、google-generativeai 等）推迟到对应章节再加，以保证首次 `uv sync` 秒级完成
- [x] 1.3 创建 `backend/app/main.py`，定义 FastAPI app、CORS、`GET /api/health` 端点（返回版本 + GPU 可用性 + 模型权重就绪状态）
- [x] 1.4 创建 `backend/app/config.py` 用 `pydantic-settings` 读取环境变量（模型缓存目录、监听端口、日志级别）
- [x] 1.5 创建 `backend/scripts/setup.sh`：调用 `uv sync` + 提示模型在首次使用时下载
- [x] 1.6 在仓库根 `README.md` 补充后端启动说明

## 2. 前端与后端通信层

- [x] 2.1 在 `vite.config.ts` 中添加 `server.proxy['/api'] = 'http://127.0.0.1:8000'`
- [x] 2.2 创建 `src/services/api.ts`，封装 `fetch` 客户端（统一错误处理、`X-LLM-Provider` header 注入、超时、`AbortSignal`）
- [x] 2.3 创建 `src/services/types.ts`，定义所有后端 DTO 的 TS 类型（与后端 pydantic schema 一一对应；可后续用 openapi-typescript 自动生成）
- [x] 2.4 创建 `src/hooks/useBackendHealth.ts`：轮询 `/api/health`，暴露 `{status, gpu, missingModels}` 状态

## 3. 照片状态机重构（前端）

- [x] 3.1 在 `src/types/index.ts` 新增 `PhotoStatus = 'pending' | 'rejected_tech' | 'rejected_ai' | 'rejected_pk' | 'finalist'`
- [x] 3.2 在 `Photo` 接口中加 `status: PhotoStatus` 与 `rejectionReason?: string`；移除 `isManuallyFlagged`
- [x] 3.3 重构 `PhotoAction`：新增 `SET_STATUS`、`SET_STATUS_FOR_SELECTED`、`RESTORE_BY_STATUS`；移除 `TOGGLE_MANUAL_FLAG`、`REMOVE_SELECTED`、`SELECT_ALL_FLAGGED`；`DESELECT_ALL` 保留（仍用于清除手工选择）
- [x] 3.4 重写 `src/contexts/PhotoContext.tsx` 的 reducer 以状态机为准；提供 helper selector `getByStatus`、`counts.{status}`；`UPDATE_ANALYSIS` 在照片仍为 `pending` 时自动迁移到 `rejected_tech` 并写入 reason
- [x] 3.5 重写 `src/components/FilterBar.tsx`：过滤维度改为 `all / pending / rejected_tech / rejected_ai / rejected_pk / finalist`；动作按钮改为 mark-as-rejected / mark-as-finalist / restore-current-filter
- [x] 3.6 重写 `src/components/PhotoThumbnail.tsx`：按 `status` 显示边框色和主状态徽章 + 拒因徽章；动作按钮按状态变化（reject / restore / star）
- [x] 3.7 重写 `src/components/PhotoGallery.tsx`：header 展示 total / finalist / rejected / selected 计数

## 4. Stage 1：技术筛迁移到状态机

- [x] 4.1 在 `src/utils/imageAnalysis.ts` 的 `analyzeImage` 中保留所有现有检测；为 `isFlagged` 加注释明确含义为"应进入 `rejected_tech`"
- [x] 4.2 创建 `src/services/pipeline/stage1.ts`：封装单张照片的 Stage 1 处理（imageData → analysis → status/reason 决策），PhotoUploader 复用；批量上传时即时落到 `rejected_tech` 或 `pending`
- [x] 4.3 创建 `src/components/PipelineProgress.tsx`：三阶段卡片，Stage 1 显示通过/淘汰数 + 进度条，Stage 2/3 占位（"即将上线"），已挂到 App 主视图

## 5. Stage 2 后端：本地美学打分

- [x] 5.1 在 `backend/app/models/aesthetic.py` 实现 `AestheticScorer`：CLIP ViT-L/14（open_clip，OpenAI 权重）+ LAION 5 层 MLP（christophschuhmann/improved-aesthetic-predictor 的 `sac+logos+ava1-l14-linearMSE.pth`），懒加载 + 线程安全单例；提供 `score(bytes)` 与 `score_batch(list[bytes])`；MPS/CUDA/CPU 自动选择
- [x] 5.2 在 `backend/app/routes/aesthetic.py` 实现 `POST /api/aesthetic/batch`：接受 multipart `images` + form `ids`，校验长度一致，懒触发模型加载（worker thread 跑推理），返回 `{items: [{id, score}], elapsed_ms}`
- [x] 5.3 用 curl 端到端验证：mismatch → 400；首次 30s（含 ~600MB 模型下载）；第二次 216ms；同图分数稳定（4.405...）；健康检查 aesthetic 从 missing 翻转为 ready
- [x] 5.4 前端 `src/services/pipeline/stage2.ts`：把 `pending` 照片缩略图转 Blob、POST 到 `/api/aesthetic/batch`、dispatch `SET_AESTHETIC_SCORES`、按分数排序后底部 `stage2RejectionRatio`（默认 30%）dispatch `SET_STATUS('rejected_ai', 'low_aesthetic_score')`
- [x] 5.5 前端 `PipelineProgress` Stage 2 卡片：Run / Re-run 按钮，phase 进度文案，错误展示，结果显示 scored / rejected / 耗时；PhotoThumbnail 在右上角显示美学分（带 sparkles 图标）

## 6. LLM Provider 路由层

- [x] 6.1 `backend/app/llm/base.py` 定义 `LLMProvider` Protocol + `CritiqueResult` (Pydantic) + `prompt_for(language)` 双语 prompt
- [x] 6.2 `backend/app/llm/openai_provider.py`：`AsyncOpenAI` + `gpt-4o` + `response_format=json_object`
- [x] 6.3 `backend/app/llm/anthropic_provider.py`：`AsyncAnthropic` + `claude-sonnet-4-5` + base64 vision content
- [x] 6.4 `backend/app/llm/google_provider.py`：`google.genai` + `gemini-2.5-flash` + `response_schema=CritiqueResult`
- [x] 6.5 `backend/app/llm/claude_cli_provider.py`：`asyncio.create_subprocess_exec('claude', '-p', ..., '--output-format', 'json')`，临时图片文件 + 路径注入 prompt，60s 超时，无论成败都删临时文件
- [x] 6.6 `backend/app/llm/registry.py` + `backend/app/routes/llm.py`：`X-LLM-Provider` header 路由 + `Authorization: Bearer <key>` 解析 + 400/401/503 错误码语义清晰
- [x] 6.7 `GET /api/llm/providers` 返回 4 家 provider 可用性；`claude-cli` 用 `shutil.which("claude")` 动态探测
- [x] 6.8 前端 `src/services/api.ts` 加 `critique()` 客户端；`src/hooks/useLLMProviders.ts` 拉取列表

## 7. Stage 2 LLM 精排

- [ ] 7.1 在 `backend/app/routes/critique.py` 实现 `POST /api/critique/topk`：接受 Top-K 图 + provider 选择 + prompt 模板；并发调用 provider，返回 `[{id, score, composition, style, suggestion}]`
- [ ] 7.2 前端 `src/services/pipeline/stage2_llm.ts`：把 Stage 2 粗排后的 Top-K（默认 20）发到 `/api/critique/topk`，结果存到 photo 上展示
- [ ] 7.3 前端 `src/components/LLMProviderSettings.tsx`：provider 下拉 + API Key 输入框（按 provider 切换显示，CLI 不显示 Key 输入）+ 健康指示灯
- [ ] 7.4 前端 `src/components/AestheticCritiquePanel.tsx`：在 PhotoThumbnail hover/click 时展示 LLM 点评

## 8. Stage 3：相似度聚类

- [x] 8.1 `backend/app/models/clip_embedder.py`：CLIP ViT-B/32（open_clip + OpenAI 权重）懒加载单例；`embed_batch(list[bytes]) -> ndarray[N, 512]`，L2 归一化
- [x] 8.2 `backend/app/routes/similarity.py`：`POST /api/similarity/cluster`，DBSCAN(cosine, eps 默认 0.15, min_samples=2)；噪声点（-1）提升为唯一 singleton cluster id；返回 `{items, n_clusters, n_groups, elapsed_ms}`
- [x] 8.3 前端 `src/services/pipeline/stage3.ts`：上传 pending 照片，dispatch `SET_CLUSTERS`，单元素 cluster 直接 `SET_STATUS('finalist')`，多元素 cluster 保留 `pending` + `clusterId` 等 PK 接管
- [x] 8.4 `Photo.clusterId` + `SET_CLUSTERS` reducer + `settings.stage3ClusterEps`；PhotoThumbnail 显示 `Cluster N` 徽章；PipelineProgress Stage 3 卡片激活（与 Stage 2 同款 Run 按钮 + 状态展示）
- [x] 8.5 端到端验证：3 张 gray + red + blue，eps=0.15 整体聚为 1 簇（语义相似），eps=0.05 拆分为 gray 簇 + red 单 + blue 单（n_clusters=3, n_groups=1），二次调用 69ms

## 9. PK 对比 UI（双 Canvas 同步缩放）

- [ ] 9.1 创建 `src/components/SyncedCanvas.tsx`：单个 Canvas 组件，受控接收 `{scale, offsetX, offsetY}` 与 `image: ImageBitmap`，在 `requestAnimationFrame` 中重绘
- [ ] 9.2 创建 `src/hooks/useSyncedZoom.ts`：管理 `{scale, offsetX, offsetY}`，绑定 wheel/pointer 事件，返回 ref 给两画布；wheel 时以鼠标位置为锚点缩放
- [ ] 9.3 创建 `src/components/ComparisonPK.tsx`：双 SyncedCanvas + "选左/选右" 按钮 + 当前 cluster 进度（"第 3 张 / 共 5 张"）+ "AI 推荐：左"提示（来自 Stage 2 分数）
- [ ] 9.4 实现锦标赛逻辑：每组按淘汰赛（败者标 `rejected_pk`，胜者继续 vs 下一张），直到剩 1 张 → `finalist`
- [ ] 9.5 创建 `src/components/PKEntryDialog.tsx`：Stage 3 结束后展示"X 组待对比，开始 PK"入口
- [ ] 9.6 性能：4K 图用 Worker + OffscreenCanvas 异步解码为 ImageBitmap；UI 显示 loading 占位

## 10. 一键下载与一键恢复

- [ ] 10.1 创建 `src/services/download.ts`：实现 `downloadFinalists(format: 'folder' | 'zip')`；'folder' 走现有 File System Access API；'zip' 用 `JSZip` 在浏览器内打包
- [ ] 10.2 在 `src/components/FilterBar.tsx`（或新的 `PipelineFooter`）添加"下载入选照片"按钮（disabled 时显示原因）
- [ ] 10.3 创建 `src/components/RestoreActions.tsx`：三个按钮"恢复全部技术淘汰 / 恢复全部 AI 淘汰 / 恢复全部 PK 淘汰"；单张恢复在 PhotoThumbnail 右键菜单
- [ ] 10.4 dispatch `RESTORE_BY_STATUS`：将该状态所有照片回滚到 `pending`（注意：从 `rejected_pk` 恢复应回到 Stage 2 通过状态，而非 pending，避免重新跑 AI）

## 11. 设置面板扩展

- [ ] 11.1 在 `src/components/SettingsDialog.tsx` 新增 Tab "AI Pipeline"：Stage 2 淘汰比例（默认 30%）、Top-K 精排数量（默认 20）、Stage 3 DBSCAN eps（默认 0.15）
- [ ] 11.2 添加 LLM 设置 Tab：嵌入 `LLMProviderSettings`、显示预估 token 消耗
- [ ] 11.3 在 `SettingsContext` 持久化 LLM provider 选择与 API Key 到 `localStorage`（带"清除"按钮）

## 12. 国际化

- [ ] 12.1 在 `src/locales/zh.json` 与 `en.json` 增加：阶段名 (`stage.technical/aesthetic/comparison`)、状态名 (`status.pending/rejected_tech/...`)、provider 名、PK 界面文案、下载/恢复按钮、错误提示
- [ ] 12.2 后端 `critique` prompt 模板按 `Accept-Language` 切换中英文

## 13. 端到端验证

- [ ] 13.1 在 `backend/` 写 `pytest` 集成测试：完整跑三阶段，输入 fixture 图片集（含技术废片、艺术差片、连拍组），断言最终 finalist 集合符合预期
- [ ] 13.2 前端手动测试清单：上传 50+ 张照片 → 三阶段流程 → PK 完成 → 下载 → 部分恢复 → 再下载
- [ ] 13.3 README 添加完整使用文档与排障指南
