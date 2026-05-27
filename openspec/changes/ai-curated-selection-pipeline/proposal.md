## Why

当前 Photo Selector 仅基于像素直方图做技术性废片预筛（曝光、死灰、死黑、虚焦）。摄影师从大批照片中挑出"成片"的真实流程还需要两层人无法跳过的判断：**审美**（构图、风格、艺术结构）和**取舍**（连拍组里挑最佳）。前者目前只能靠人逐张翻看，后者目前完全没有支持。

本次重构引入 AI 能力（本地模型 + 用户可选 LLM 云服务），把流程升级为**三阶段递进筛选**，让人只在最关键的"二选一"环节出手。同时把"删除"的不可逆操作改为**软淘汰 + 一键恢复**，最后**一键打包下载入选照片**。

## What Changes

### 架构层面
- **新增 Python 后端服务**（FastAPI），承担所有 AI 推理与 LLM 调用；前端通过 HTTP/WebSocket 与之通信
- **照片状态机重构**：从扁平的 `isFlagged / isSelected` 升级为 `pending → rejected_tech | rejected_ai | rejected_pk | finalist` 的状态机，所有"淘汰"皆软删除，可恢复

### 三阶段流水线
1. **Stage 1 - 技术筛**（保留现有算法，迁移结果到新状态机）：技术废片标记为 `rejected_tech`
2. **Stage 2 - AI 美学排序**（新增）：本地 NIMA/LAION-Aesthetic-Predictor 给所有 Stage 1 通过的照片打分；底部 N% 标记为 `rejected_ai`；Top-K 可选调用 LLM 提供文字点评
3. **Stage 3 - 相似组 PK**（新增）：用 CLIP embedding + DBSCAN 聚类找出连拍/相似组，每组进入双图对比界面，用户两两 PK 直到剩 1 张；落选者标记为 `rejected_pk`

### LLM 与本地模型
- **本地模型**：CLIP（embedding）、NIMA 或 LAION-Aesthetic-Predictor（美学打分）、`rawpy`（RAW 解码）
- **LLM 路由层**：用户可选 OpenAI / Anthropic / Google / 本地 Claude Code CLI；统一 `LLMProvider` 接口，运行期切换
- **Claude Code CLI 集成**：通过 `subprocess` 调用本地已安装的 `claude` 命令，复用用户订阅、无需 API Key

### 前端
- **PK 对比界面**：双 `<canvas>` 共享 transform matrix，wheel/pointer 事件统一派发实现同步缩放/平移
- **流水线进度 UI**：三阶段进度条 + 每阶段结果预览
- **设置面板扩展**：LLM provider 选择、API Key 管理（存 localStorage，仅会话内通过 header 转发到本地后端，后端不持久化）
- **一键下载**：finalists 打包为 ZIP（仍走 File System Access API 写入目录作为可选）
- **一键恢复**：按阶段恢复（恢复所有 `rejected_tech` / `rejected_ai` / `rejected_pk`，或恢复指定照片）

## Capabilities

### New Capabilities
- `python-backend`: FastAPI 后端服务，提供 AI 推理、LLM 调用、图像预处理 API
- `llm-provider-routing`: 统一 LLM 抽象，支持 OpenAI / Anthropic / Google / Claude Code CLI 运行期切换
- `aesthetic-ranking`: 基于本地 NIMA/LAION 模型给照片打美学分；可选 LLM 对 Top-N 给文字点评
- `similarity-clustering`: CLIP embedding + DBSCAN 聚类，识别连拍/相似组
- `comparison-pk-ui`: 双画布同步缩放/平移的两两对比界面，锦标赛式淘汰
- `photo-state-machine`: 软淘汰状态机，支持按阶段或单张恢复
- `batch-download-restore`: 一键下载入选照片 + 一键恢复淘汰照片

### Modified Capabilities
- `photo-prefilter`: 现有结果作为 Stage 1，迁移到新状态机的 `rejected_tech` 状态
- `save-to-folder`: 重命名为 `batch-download-restore` 的一部分，仅对 finalists 生效

## Impact

### 新增
- `backend/` 整个目录（Python + FastAPI + uv 项目）
- `src/services/api.ts`（前端 API 客户端）
- `src/components/PipelineProgress.tsx`、`src/components/ComparisonPK.tsx`、`src/components/LLMProviderSettings.tsx`
- `src/contexts/PipelineContext.tsx`（阶段化状态管理）

### 修改
- `src/types/index.ts`：`Photo.status` 状态机字段，移除 `isManuallyFlagged`（合并为状态）
- `src/contexts/PhotoContext.tsx`：reducer 改为基于状态机
- `src/components/FilterBar.tsx`：过滤维度按状态机重构
- `src/components/PhotoThumbnail.tsx`：按状态着色/角标
- `src/App.tsx`：增加 `PipelineProvider`

### 部署/运行
- 开发期：用户需手动 `cd backend && uv run uvicorn app.main:app --reload`，前端通过 Vite proxy 转发到后端
- 浏览器：仍只支持 Chromium 系（File System Access API）
- 依赖：后端首次启动需下载 CLIP / NIMA 权重（~500MB-1GB），有进度提示

## Non-Goals

- 不做生产部署/多用户/账号系统
- 不做云存储（照片始终留在用户本地）
- 不做视频
- 不做桌面打包（Tauri/Electron 留作后续 change）
- 不做模型微调，只用现成预训练权重
