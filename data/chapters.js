// Public chapter registry: chapters 1, 2 and 3 only.
const CHAPTERS = [
  {
    "id": 1,
    "section": "geometry",
    "name": "几何光学的基本定律与成像概念",
    "desc": "光的直线传播、反射/折射定律、费马原理、马吕斯–杜潘定理及单个折射球面光路计算与四个放大率 (PDF P10)",
    "status": "ready",
    "href": "chapters/chapter1.html",
    "topics": [
      {
        "id": "straight",
        "name": "直线传播定律"
      },
      {
        "id": "reflection",
        "name": "反射定律"
      },
      {
        "id": "refraction",
        "name": "折射 / 全反射"
      },
      {
        "id": "fermat",
        "name": "费马原理"
      },
      {
        "id": "malus",
        "name": "马吕斯–杜潘定理"
      },
      {
        "id": "perfect-imaging",
        "name": "完善成像·三等价条件"
      },
      {
        "id": "sphere-paraxial",
        "name": "单个球面近轴光路与四个放大率"
      },
      {
        "id": "sphere-exact",
        "name": "单个球面折射定律光路计算"
      }
    ]
  },
  {
    "id": 2,
    "section": "geometry",
    "name": "理想光学系统",
    "desc": "焦点/主点/节点独立与全景模型、焦距折射率厚度模型、图2-1物像共轭、垂轴放大率、薄透镜箭头两光组组合、曲率解耦及正切计算法 (P23例2-4)",
    "status": "ready",
    "href": "chapters/chapter2.html",
    "topics": [
      {
        "id": "focal-plane",
        "name": "焦点与焦平面 (独立模型)"
      },
      {
        "id": "principal-plane",
        "name": "主点与主平面 (独立模型)"
      },
      {
        "id": "nodal-plane",
        "name": "节点与节平面 (独立模型)"
      },
      {
        "id": "cardinal",
        "name": "基点基面综合全景"
      },
      {
        "id": "focal-index",
        "name": "焦距与折射率关系 (含厚度d)"
      },
      {
        "id": "gauss-newton",
        "name": "物像位置关系 (图2-1)"
      },
      {
        "id": "magnification",
        "name": "垂轴放大率随物距变化 (图2-2)"
      },
      {
        "id": "ideal-combo",
        "name": "理想光学系统组合 (薄透镜箭头 ⟷/><)"
      },
      {
        "id": "thick-lens",
        "name": "透镜形状与曲率焦距 (图2-4解耦)"
      },
      {
        "id": "tangent-method",
        "name": "正切计算法 (教材 P23 例2-4)"
      }
    ]
  },
  {
    "id": 3,
    "section": "geometry",
    "name": "平面与平面系统",
    "desc": "平面镜转动与微位移测角、平行平板、折射棱镜、双光楔测微、教材P36-38全系列3D棱镜立体模型库",
    "status": "ready",
    "href": "chapters/chapter3.html",
    "topics": [
      {
        "id": "plane-mirror-rotation",
        "name": "平面镜转动与微位移"
      },
      {
        "id": "mirror-measurement",
        "name": "微小位移测角系统"
      },
      {
        "id": "parallel-plate",
        "name": "平行平板横向位移与像偏移"
      },
      {
        "id": "prism",
        "name": "折射棱镜偏向角与色散"
      },
      {
        "id": "double-wedge",
        "name": "双光楔测微与偏转"
      },
      {
        "id": "prism-3d",
        "name": "3D 棱镜立体模型库 (P36-38)"
      }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) module.exports = CHAPTERS;
