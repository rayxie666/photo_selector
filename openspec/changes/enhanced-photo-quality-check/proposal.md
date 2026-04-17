## Why

当前的照片分析仅检测曝光和亮度问题，但摄影后期中还有几类常见的"废片"：死灰（整体低饱和度/灰蒙蒙）、死黑（极端欠曝无细节）和虚焦（无法后期修复的模糊）。另外，现有工具只支持删除不想要的照片，缺少将筛选出的优质照片导出到指定文件夹的能力。

## What Changes

- **新增死灰检测**：通过分析图像整体饱和度，识别色彩严重不饱和、画面灰蒙的照片
- **新增死黑检测**：检测直方图中极暗区域占比极高（无任何细节的纯黑）的照片，与普通欠曝区分
- **新增虚焦检测**：使用 Laplacian 方差算法检测图像锐度，标记无法后期修复的模糊照片
- **新增保存到文件夹功能**：使用 File System Access API，允许用户将选中的照片保存到本地指定文件夹
- **分析结果类型扩展**：`AnalysisResult` 增加新的质量问题字段
- **设置扩展**：`AnalysisSettings` 增加死灰、死黑、虚焦的灵敏度配置项
- **UI 扩展**：FilterBar 增加"保存选中"按钮；PhotoThumbnail 和详情展示新增质量问题角标/标签

## Capabilities

### New Capabilities

- `gray-flat-detection`: 检测死灰照片——通过分析像素 HSL 饱和度分布，判断图像是否整体偏灰、缺乏色彩
- `pure-black-detection`: 检测死黑照片——识别直方图中极暗像素（亮度 < 5）占比超过阈值的照片
- `blur-detection`: 检测虚焦照片——使用 Laplacian 卷积计算图像方差，方差低于阈值则判定为模糊
- `save-to-folder`: 保存选中照片到文件夹——使用 File System Access API 让用户选择目标文件夹并将选中照片文件写入其中

### Modified Capabilities

- `photo-exposure-prefilter`: 扩展分析结果数据结构（AnalysisResult）以包含新的质量检测字段，并在 isFlagged 判断逻辑中纳入新检测项

## Impact

- `src/utils/imageAnalysis.ts`：新增死灰、死黑、虚焦检测函数；`analyzeImage` 函数返回值扩展
- `src/types/index.ts`：`AnalysisResult` 接口新增字段；`AnalysisSettings` 接口新增配置项
- `src/contexts/PhotoContext.tsx`：无需改动（数据结构变化透传）
- `src/components/FilterBar.tsx`：新增"保存选中"按钮及 File System Access API 调用逻辑
- `src/components/SettingsDialog.tsx`：新增三类检测的灵敏度设置控件
- `src/components/PhotoThumbnail.tsx`：新增质量问题角标展示
- `src/locales/`：新增 i18n 翻译键
- 浏览器兼容性：File System Access API 仅支持现代 Chromium 系浏览器，需降级处理（不支持时禁用该按钮）
