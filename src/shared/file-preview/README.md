# 文件预览公共模块

从 `/home/xinghaohuang/StoraGent/frontend` 的公共模块适配到 React，保留当前 BatteryScientist API 与 Monaco 编辑器。

| 当前模块                                | StoraGent 参考来源                    | 复用范围                                    |
| --------------------------------------- | ------------------------------------- | ------------------------------------------- |
| `display.ts`                            | `shared/artifacts/artifactDisplay.ts` | 文件大小格式化                              |
| `siblingImages.ts`                      | `shared/artifacts/filePreview.ts`     | 同目录图片筛选，补充自然排序                |
| `PaneDivider.tsx`                       | `features/chat/files/LatexEditor.vue` | 指针捕获、25–75% 分栏限制、键盘调整         |
| `../../features/workbench/Editor.tsx`   | `features/chat/files/LatexEditor.vue` | 保存快捷键、撤销重做、编辑状态；适配 Monaco |
| `../../features/workbench/Artifact.tsx` | `features/chat/files/LatexEditor.vue` | 保存快照与当前草稿分离，保存期间输入保留    |

StoraGent 使用 Vue，界面组件在此按 React 生命周期适配；不引入 Vue 运行时或其后端接口。上游 MIT 授权全文见 `STORAGENT-LICENSE.txt`。
