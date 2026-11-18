# Carmall24 前端预览

下载或克隆仓库后，用浏览器打开 [index.html](index.html) 即可预览。项目使用原生 HTML、CSS 和 JavaScript，无需安装依赖。图片和图标位于 `assets/`。

- [首页](index.html)按新版设计展示两行品牌、每组五张热门二手车和热门新车卡片。收藏复用全站收藏状态；“View All Brands”打开 Makes 面板。首页新车卡片保留设计稿中的车型、图片和价格示例，点击进入新车列表；咨询按钮会在首页联系表单中预填车型。
- [新车列表](new-cars.html)和[二手车列表](used-cars.html)可切换单行与多列展示。筛选与排序共用 `inventory.js`，演示车源位于 `inventory-data.js`。
- [车辆详情](vehicle-detail.html?id=new-mg5)包含新车与二手车展示，可通过列表卡片进入。详情布局及交互位于 `vehicle-detail.css` 和 `vehicle-detail.js`，详情数据位于 `vehicle-detail-data.js`。
- [合作页面](work-with-us.html)链接到[经销商申请流程](dealer-application.html)。
- `styles.css` 和 `app.js` 包含全站导航及通用交互。

车源包含示例数据及 2026-11-17 采集的 Carmall24 官网公开快照，新闻使用示例数据。询价表单生成邮件草稿。经销商申请和保证金步骤为本地演示。页面优先使用本机 MiSans，详情部分使用苹方，备用字体为 Arial。

开发接入时，完整售价需由登录后的报价接口返回。在官网同源部署时，详情页通过 `/app-api/mall/new-car/details` 和 `/app-api/mall/used-car/details` 读取报价。其他部署环境可提供 `window.carmallAuthenticatedFetch(url, options)` 复用账号会话，并在登录或退出后向 `window` 派发 `carmall:sessionchange` 事件刷新价格。本地文件预览显示脱敏售价。

二手车验车卡当前没有公开的检测结果，使用“Not reported”展示。实际检测状态及完整报告需接入对应业务数据。

首页品牌图片保存在 `assets/home-brands/`，使用 Carmall24 官网公开品牌接口返回的原图。显示名称及顺序沿用首页 Figma 设计稿（包含重复名称和示例名称），开发对接时可替换为正式品牌、车源数据。
