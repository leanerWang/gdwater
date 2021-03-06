 //粒子更新函数
async function update(particle, dt) {
    let offsetValue = 5;
    let offsetX = Cesium.Math.randomBetween(-offsetValue,offsetValue);
    let offsetY = Cesium.Math.randomBetween(-offsetValue,offsetValue);
    let offsetCartesian = new Cesium.Cartesian3(offsetX, offsetY, 0) 
    // let offsetX = new Cesium.Cartesian3(5, 0, 0) //相邻点偏移量
    // let offsetY = new Cesium.Cartesian3(0,5,0)
    let position = particle.position
    
    //particle.velocity = Cesium.Cartesian3.UNIT_X;//会报错，不能直接赋值
    // Cesium.Cartesian3.clone(
    //     new  Cesium.Cartesian3(0, 0, -1),
    //         particle.velocity
    // );
   
    //转换为模型坐标
    let positionScratch = Cesium.Matrix4.multiplyByPoint(
        modelMatrixCom.worldToModel,
        position,
        new Cesium.Cartesian3()
    );

    //偏移
    let positionOffset = Cesium.Cartesian3.add(positionScratch, offsetCartesian, new Cesium.Cartesian3())
    // console.log(positionScratch+":"+positionOffset);

    //转换为世界坐标
    let positionOffsetScratch = Cesium.Matrix4.multiplyByPoint(
        modelMatrixCom.modelToWorld,
        positionOffset,
        new Cesium.Cartesian3()
    );

    //根据x,y计算地形高度
    let beforePositionCarto = Cesium.Cartographic.fromCartesian(position, Cesium.Ellipsoid.WGS84, new Cesium.Cartographic())
    let newPositionCarto=  Cesium.Cartographic.fromCartesian(positionOffsetScratch, Cesium.Ellipsoid.WGS84, new Cesium.Cartographic())
    
    let beforePosition =  await Cesium.sampleTerrainMostDetailed(hhuDem, beforePositionCarto)
    let newPosition = await Cesium.sampleTerrainMostDetailed(hhuDem, newPositionCarto)
    let differenceHeight = newPosition.height - beforePosition.height
    //改天继续-20210203
    if (differenceHeight <0) {
        // let velocity = Cesium.Cartesian3.add(offsetCartesian, new Cesium.Cartesian3(0,0,differenceHeight), new Cesium.Cartesian3())
        particle.position =  positionOffsetScratch
      
    }else{
       
        // Cesium.Cartesian3.clone(
        //     Cesium.Cartesian3.ZERO,
        //     particle.velocity
        // );
    }

    //失败了，换种思路？20200203

}

/**划分网格 */
async function meshing() {

    let lon1 = ModelObject.lon1;//左边界经度
    let lon2 = ModelObject.lon2;//右边界经度
    let lat1 = ModelObject.lat1;//左边界纬度
    let lat2 = ModelObject.lat2;//右边界纬度

    let num = 10;//划分网格份数

    // //划分
    // let lonDifference = Math.abs(lon1 - lon2) / num;
    // let lengthDiffence = length / num;
    // // let centerOffset = lonDifference / 2; //元胞中心偏移量

    // for (let i = 0; i < num + 1; i++) {
    //     let lon = lon1 + lonDifference * i;
    //     lons.push([lon, lat1]);

    // }

    let updatedPositions = await ModelObject.getTerrainCartesian3([[lon1, lat1]], hhuDem);//获取地形promise对象 

    let pointHeight = updatedPositions[0].height;

    //建立以左下角点位原点的笛卡尔坐标系
    let modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromDegrees(lon1, lat1, pointHeight)
    );

    let transformsMatrix = ParticalObject.computerModelMatrix(modelMatrix);//计算变化矩阵

    //计算右下角点的模型坐标
    let rightButtom = Cesium.Matrix4.multiplyByPoint(
        transformsMatrix.worldToModel,//转换矩阵
        Cesium.Cartesian3.fromDegrees(lon2, lat1),//笛卡尔坐标系下点的坐标cartesian3，世界坐标系里
        new Cesium.Cartesian3()//得到粒子坐标系下的位置cartesian3
    );

    //计算左上角点的模型坐标
    let leftTop = Cesium.Matrix4.multiplyByPoint(
        transformsMatrix.worldToModel,//转换矩阵
        Cesium.Cartesian3.fromDegrees(lon1, lat2),//笛卡尔坐标系下点的坐标cartesian3，世界坐标系里
        new Cesium.Cartesian3()//得到粒子坐标系下的位置cartesian3
    );

    let length = rightButtom.x;//模型总长度
    let width = leftTop.y;//模型总宽度
    let deepth = 500.0;//模型总高度

    //定义节点
    let nodeX = [];//存放x坐标的节点
    let nodeY = [];
    let nodeZ = [];

    let intervalX = length / num;//网格的x长度
    let intervalY = width / num;
    let intervalZ = deepth / num;

    //切分x
    for (let i = 0; i < num; i++) {
        nodeX.push(intervalX * (i + 1));
    }

    //切分y
    for (let j = 0; j < num; j++) {
        nodeY.push(intervalY * (j + 1));
    }

    //切分z
    for (let k = 0; k < num; k++) {
        nodeZ.push(intervalZ * (k + 1));
    }

    //计算网格中心点坐标
    let centerPoints = []//存放中心点坐标
    for (let k = 0; k < num; k++) {
        for (let j = 0; j < num; j++) {
            for (let i = 0; i < num; i++) {
                let point = ParticalObject.computerCenterPosition(nodeX[i], nodeY[j], nodeZ[k], intervalX, intervalY, intervalZ);
                centerPoints.push(point);//{'name': (i+1, j+1, z+1), 'value': point}
            }

        }
    }
    // console.log(centerPoints);

    let centerPointsTransfrom = [];//元胞中心的世界笛卡尔坐标

    //将网格中心坐标变换至世界坐标系
    centerPoints.forEach(element => {
        //将值转换为cartesian3
        let positionCartesian3 = new Cesium.Cartesian3(element.centerX, element.centerY, element.centerZ);
        let position = ParticalObject.computerWorldPosition(transformsMatrix, positionCartesian3);
        centerPointsTransfrom.push(position);
    });

    //显示元胞网格
    for (let i = 0; i < centerPointsTransfrom.length; i++) {
        ParticalObject.addBoxEntities(centerPointsTransfrom[i], intervalX, intervalY, intervalZ);

    }

    scene.primitives.add(
        new Cesium.DebugModelMatrixPrimitive({
            modelMatrix: modelMatrix,
            length: 1000.0,
        })
    );
}

/**模拟地表污染扩散 */
function surfaceDiffusion() {
    let points = ParticalObject.points
    let heigthBefore = points[0]
     
    let modelMatrixCom = ParticalObject.computerModelMatrix(modelMatrix);
    if ( ParticalObject.points.length == 0) {
        console.log("请选择污染源！");
        return;
        
    }
     //粒子更新函数
    async function update(particle, dt) {
        let offsetValue = 5;
        let offsetX = Cesium.Math.randomBetween(-offsetValue,offsetValue);
        let offsetY = Cesium.Math.randomBetween(-offsetValue,offsetValue);
        let offsetCartesian = new Cesium.Cartesian3(offsetX, offsetY, 0) 
        // let offsetX = new Cesium.Cartesian3(5, 0, 0) //相邻点偏移量
        // let offsetY = new Cesium.Cartesian3(0,5,0)
        let position = particle.position
        
        //particle.velocity = Cesium.Cartesian3.UNIT_X;//会报错，不能直接赋值
        // Cesium.Cartesian3.clone(
        //     new  Cesium.Cartesian3(0, 0, -1),
        //         particle.velocity
        // );
       
        //转换为模型坐标
        let positionScratch = Cesium.Matrix4.multiplyByPoint(
            modelMatrixCom.worldToModel,
            position,
            new Cesium.Cartesian3()
        );

        //偏移
        let positionOffset = Cesium.Cartesian3.add(positionScratch, offsetCartesian, new Cesium.Cartesian3())
        // console.log(positionScratch+":"+positionOffset);

        //转换为世界坐标
        let positionOffsetScratch = Cesium.Matrix4.multiplyByPoint(
            modelMatrixCom.modelToWorld,
            positionOffset,
            new Cesium.Cartesian3()
        );

        //根据x,y计算地形高度
        let beforePositionCarto = Cesium.Cartographic.fromCartesian(position, Cesium.Ellipsoid.WGS84, new Cesium.Cartographic())
        let newPositionCarto=  Cesium.Cartographic.fromCartesian(positionOffsetScratch, Cesium.Ellipsoid.WGS84, new Cesium.Cartographic())
        
        let beforePosition =  await Cesium.sampleTerrainMostDetailed(hhuDem, beforePositionCarto)
        let newPosition = await Cesium.sampleTerrainMostDetailed(hhuDem, newPositionCarto)
        let differenceHeight = newPosition.height - beforePosition.height
        //改天继续-20210203
        if (differenceHeight <0) {
            // let velocity = Cesium.Cartesian3.add(offsetCartesian, new Cesium.Cartesian3(0,0,differenceHeight), new Cesium.Cartesian3())
            particle.position =  positionOffsetScratch
          
        }else{
           
            // Cesium.Cartesian3.clone(
            //     Cesium.Cartesian3.ZERO,
            //     particle.velocity
            // );
        }

        //失败了，换种思路？20200203

    }

    ParticalObject.points.forEach(element => {
       
        let emitterInitialLocation = Cesium.Matrix4.multiplyByPoint(
            modelMatrixCom.worldToModel,//转换矩阵
            element,//笛卡尔坐标系下点的坐标cartesian3，世界坐标系里
            new Cesium.Cartesian3()//得到粒子坐标系下的位置cartesian3
        );

        let emitterModelMatrix = Cesium.Matrix4.fromTranslation(
            emitterInitialLocation,
            new Cesium.Matrix4()
        );//转换为四阶矩阵

        //添加粒子系统
        let particalSystem = scene.primitives.add(new Cesium.ParticleSystem({
            image: getImage(),//粒子图像
            color: Cesium.Color.CYAN,//开始颜色
            particleLife: 100,//每个粒子的生存时间，即子弹被打出来后能飞多久
            speed: 0.1,//粒子飞行速度
            imageSize: particlePixelSize,//粒子大小
            emissionRate: 5.0,//每秒发射粒子的个数
            emitter: new Cesium.BoxEmitter(),//粒子发射器的形式，确定了在什么样的区间里随机产生粒子
            lifetime: 100,//粒子发射器的生命周期，即发射粒子的时间
            updateCallback: update,//粒子位置更新回调函数
            modelMatrix: modelMatrix,//决定粒子在空间坐标系的位置矩阵
            emitterModelMatrix: emitterModelMatrix//决定粒子相对于模型位置的位置矩阵
        }));
        ParticalObject.particalSystems.push(particalSystem)
    
    });
    ParticalObject.points.length = 0;//清空污染点  

}

function test1(){
    x = []
    xy = []
    xyz = []
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {    
                x.push(k+j)                
            }
            xy.push(x)       
        }
         xyz.push(xy)    
    }
    console.log(xyz);   
}

function test2() {
    let a = [[1,2],[1,3],[1,2]]
    let b =  Array.from(new Set(a))
    console.log(b);
}

function test3() {
    let a = {
        b : [1,2,3]
    }
    i = 0
    while(a.b.length != 0){
        c = a.b
        console.log(c);
        c.shift()
        if (i < 2) {
            c.push(i+4)
        }
        i++
    }
}
function test4() {
    let a = {
        b : [1,2,3]
    }
    c = a.b
    for (let i = 0; i < c.length; i++) {
        console.log(c[i])
        if (i == 2) {
            c.push(4)
            c.push(5)
        }        
    }
}
