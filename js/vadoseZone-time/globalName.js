// 谷歌影像
var ggImagery = new Cesium.UrlTemplateImageryProvider({
    url: "http://mt1.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}&s=Gali"
});

var cesiumClock = new Cesium.Clock ({
    shouldAnimate: true,
})
var viewer = new Cesium.Viewer('cesiumContainer',{
    imageryProvider: false,
    baseLayerPicker: false,
    clockViewModel: new Cesium.ClockViewModel(cesiumClock),
});

viewer._cesiumWidget._creditContainer.style.display="none";   //版权控件的显示隐藏
var scene = viewer.scene;
scene.globe.baseColor = Cesium.Color.BLACK;