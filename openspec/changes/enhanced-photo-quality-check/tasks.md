## 1. 扩展类型定义

- [x] 1.1 在 `src/types/index.ts` 的 `AnalysisResult` 接口中新增字段：`isGrayFlat: boolean`、`isPureBlack: boolean`、`isBlurry: boolean`
- [x] 1.2 在 `src/types/index.ts` 的 `AnalysisSettings` 接口中新增字段：`grayFlatThreshold: number`、`pureBlackThreshold: number`、`blurThreshold: number`

## 2. 扩展图像分析算法

- [x] 2.1 在 `src/utils/imageAnalysis.ts` 中修改像素扫描循环，在计算直方图时同时累加每个像素的 HSL 饱和度总和，用于死灰检测
- [x] 2.2 在 `src/utils/imageAnalysis.ts` 中新增 `detectGrayFlat(imageData, threshold)` 函数，计算平均饱和度并与阈值比较
- [x] 2.3 在 `src/utils/imageAnalysis.ts` 中新增 `detectPureBlack(histogram, threshold)` 函数，统计亮度 < 5 的像素占比
- [x] 2.4 在 `src/utils/imageAnalysis.ts` 中新增 `detectBlur(imageData, threshold)` 函数，应用 3×3 Laplacian 核并计算响应值方差
- [x] 2.5 在 `src/utils/imageAnalysis.ts` 的 `analyzeImage` 函数中调用三个新检测函数，将结果合并进返回的 `AnalysisResult`
- [x] 2.6 更新 `analyzeImage` 函数中的 `isFlagged` 计算逻辑，纳入 `isGrayFlat`、`isPureBlack`、`isBlurry` 字段

## 3. 扩展设置上下文

- [x] 3.1 在 `src/contexts/SettingsContext.tsx` 的默认设置中为三个新阈值添加默认值（`grayFlatThreshold: 15`、`pureBlackThreshold: 60`、`blurThreshold: 100`）

## 4. 更新设置对话框 UI

- [x] 4.1 在 `src/components/SettingsDialog.tsx` 中为 `grayFlatThreshold` 添加滑块控件（范围 0–50，标签："死灰饱和度阈值 / Gray-flat Threshold"）
- [x] 4.2 在 `src/components/SettingsDialog.tsx` 中为 `pureBlackThreshold` 添加滑块控件（范围 20–90，标签："死黑像素占比阈值 / Pure-black Threshold"）
- [x] 4.3 在 `src/components/SettingsDialog.tsx` 中为 `blurThreshold` 添加滑块控件（范围 10–500，标签："虚焦方差阈值 / Blur Threshold"）

## 5. 更新照片缩略图展示

- [x] 5.1 在 `src/components/PhotoThumbnail.tsx` 中为 `isGrayFlat`、`isPureBlack`、`isBlurry` 各添加一个角标/图标，当对应字段为 `true` 时显示
- [x] 5.2 确保新角标不与现有的曝光/亮度角标重叠，合理安排布局

## 6. 添加保存到文件夹功能

- [x] 6.1 在 `src/components/FilterBar.tsx` 中添加"保存选中 / Save Selected"按钮，当 `selectedCount === 0` 或浏览器不支持 `showDirectoryPicker` 时禁用
- [x] 6.2 实现 `handleSaveSelected` 函数：调用 `window.showDirectoryPicker()`，遍历选中照片并逐一写入目标目录
- [x] 6.3 对不支持 File System Access API 的浏览器添加 tooltip 说明（"此功能需要 Chrome 或 Edge"）
- [x] 6.4 在保存 10 张及以上照片时显示进度提示（如 toast 通知："正在保存 X/Y..."）
- [x] 6.5 处理文件写入失败的错误情况：捕获异常、显示错误通知、继续写入剩余文件

## 7. 国际化（i18n）

- [x] 7.1 在 `src/locales/zh.json`（或对应中文翻译文件）中新增键：`analysis.grayFlat`、`analysis.pureBlack`、`analysis.blurry`、`actions.saveSelected`、`errors.saveFolder`、`info.browserNotSupported`
- [x] 7.2 在 `src/locales/en.json`（或对应英文翻译文件）中新增对应英文翻译键
