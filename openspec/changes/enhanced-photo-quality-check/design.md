## Context

Photo Selector 是一个纯前端 React/TypeScript 应用，使用 Canvas API 对图像进行像素级分析。现有分析管道位于 `src/utils/imageAnalysis.ts`，通过直方图判断曝光状态。分析结果存储在 `AnalysisResult` 接口中，并通过 `PhotoContext` 在应用中流转。

新增的三类检测（死灰、死黑、虚焦）都需要在同一个 Canvas 像素分析流程中完成，以避免重复加载图像。文件保存功能依赖 File System Access API，需要浏览器支持。

## Goals / Non-Goals

**Goals:**
- 在现有单次像素扫描中复用 ImageData，新增饱和度统计、极暗像素计数
- 使用 Laplacian 3×3 卷积核计算图像方差作为虚焦判据
- 扩展 `AnalysisResult` 和 `AnalysisSettings` 接口，保持向后兼容
- 使用 File System Access API 实现"保存到文件夹"，不支持时优雅降级
- 通过 i18n 键支持中英文展示新检测结果

**Non-Goals:**
- 不做服务端处理或云存储
- 不支持视频文件
- 不做机器学习模型推断（保持纯算法检测）
- 不修改照片本身

## Decisions

### 1. 复用单次像素扫描计算所有指标
**决策**：在 `calculateHistogram` 阶段同时收集 RGB 像素数据以计算饱和度（HSL 转换），计算极暗像素数（亮度 < 5）。
**原因**：对大图像多次扫描 ImageData 会有明显性能损耗；一次 for 循环完成所有统计是最优方案。
**替代方案**：单独函数分别扫描 → 性能差，放弃。

### 2. 死灰检测：HSL 平均饱和度阈值法
**决策**：将每个像素从 RGB 转为 HSL，统计全图平均饱和度。平均饱和度低于可配置阈值（默认 15%）判定为死灰。
**原因**：死灰的本质是色彩信息缺失，HSL 饱和度直接表征这一属性。
**替代方案**：RGB 标准差法（通道间差异小 → 灰）→ 对彩色低光场景误判率高，放弃。

### 3. 死黑检测：极暗像素占比阈值法
**决策**：统计亮度 < 5 的像素占总像素比，超过可配置阈值（默认 60%）判定为死黑。与现有的 shadow clipping（亮度 = 0）不同，死黑允许极微弱细节但整体黑。
**原因**：与 `underexposed`（普通欠曝）区分：普通欠曝有可恢复细节，死黑无任何后期价值。
**替代方案**：直接使用 shadowClipping 判断 → 阈值不够灵活，容易误杀正常低调摄影，放弃。

### 4. 虚焦检测：Laplacian 方差法
**决策**：对缩略图（800px 限制下）应用 3×3 Laplacian 核（[0,1,0,1,-4,1,0,1,0]），计算响应值方差。方差低于可配置阈值（默认 100）判定为虚焦。
**原因**：Laplacian 方差是衡量图像锐度最广泛的单值指标，计算简单、效果稳定。
**替代方案**：FFT 高频分量法 → 在浏览器中实现复杂且性能差，放弃；Sobel 梯度均值法 → 对噪点图误判，放弃。

### 5. 保存到文件夹：File System Access API + 降级处理
**决策**：检测 `window.showDirectoryPicker` 可用性。支持时调用 API 让用户选择目录并写入文件；不支持时（Firefox、Safari）禁用按钮并展示 tooltip 说明浏览器限制。
**原因**：File System Access API 是 Web 平台唯一能实现真正"保存到指定文件夹"的方案；ZIP 下载是备选但用户体验差。
**替代方案**：打包 ZIP 下载 → 不是用户要求的"保存到文件夹"，作为未来扩展考虑。

### 6. 接口扩展策略
**决策**：`AnalysisResult` 新增 `isGrayFlat: boolean`、`isPureBlack: boolean`、`isBlurry: boolean` 字段，`isFlagged` 计算逻辑纳入新字段。`AnalysisSettings` 新增对应灵敏度配置（带默认值）。
**原因**：保持现有调用方代码最小改动，字段均有默认值可选。

## Risks / Trade-offs

- **虚焦误判** → 低纹理场景（纯色背景、天空）天然低方差，可能被误判为虚焦。缓解：提供用户可调整阈值；建议用户在 Settings 中按场景调低灵敏度。
- **死灰误判** → 高品质黑白摄影、雾景刻意营造的低饱和风格会被误判。缓解：同样提供可调阈值，且 Manual Flag 机制允许用户手动推翻。
- **File System Access API 浏览器兼容性** → Chrome/Edge 支持，Firefox/Safari 不支持。缓解：降级时禁用按钮，tooltip 提示"请使用 Chrome 或 Edge"。
- **大批量写入性能** → 写入数百张照片时页面可能卡顿。缓解：使用 async/await 逐个写入，展示进度条（如 toast 通知）。
- **分析时间增加** → Laplacian 卷积在 800px 图像上增加约 10-20ms/张。可接受，无需异步拆分。

## Migration Plan

1. 更新 `AnalysisSettings` 接口并在 `SettingsContext` 中补充默认值（不破坏现有保存的设置）
2. 更新 `AnalysisResult` 接口，`analyzeImage` 函数返回新字段
3. 更新 `imageAnalysis.ts` 实现新检测逻辑
4. 更新 `FilterBar.tsx` 增加保存按钮
5. 更新 `SettingsDialog.tsx` 增加新设置项
6. 更新 `PhotoThumbnail.tsx` 展示新质量角标
7. 更新 i18n 翻译文件

无需数据迁移，无持久化存储变更。
