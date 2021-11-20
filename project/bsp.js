
require('./tiny-graphics-copy.js');

// Pull these names into this module's scope for convenience:
const {vec3, vec4, vec, color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;


class Line {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
    }
    toString() {
        return '{[' + this.p1 + '], [' + this.p2 + ']} ';
    }
}

function midpoint(p1, p2) {
    return vec3(
        (p1[0] + p2[0])/2,
        (p1[1] + p2[1])/2,
        (p1[2] + p2[2])/2,
    );
}

function normalize(v) {
    let length = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return vec3(
        v[0]/length,
        v[1]/length,
        v[2]/length
    );
}

function sub3(v1, v2) {
    return vec3(
        v1[0] - v2[0],
        v1[1] - v2[1],
        v1[2] - v2[2]
    );
}

function dot(v1, v2) {
    return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
}

class BSPLine {
    constructor(p, n) {
        this.p = p;
        this.n = normalize(n);
    }
    toString() {
        return '{p: [' + this.p + '], normal: [' + this.n + ']}';
    }
    whichSide(p1) {
        let dp = dot(sub3(p1, this.p), this.n);
        if (dp > 0) return "front"
        else if (dp < 0) return "back"
        else return "collinear";
    }
}

class BSPNode {
    constructor(p) {
        this.p = p;
    }
}

class BSPTree {
    constructor() {
        console.log('creating bsp tree');
        this.front = [];
        this.back = [];
        this.hyperplane = new BSPLine(vec3(0,0,0), vec3(0,-1,0));
        this.polygons = [];
    }
}




let a = new BSPTree();

let v = vec3(1,2,3);
console.log(v[1]);
console.log(''+v);

let l1 = new Line(vec3(1,2,3), vec3(1,2,5));
console.log(''+l1);

let line_a = new Line(vec3(0,0,0), vec3(2,0,0));
let line_b = new Line(vec3(0,-1,0), vec3(0,1,0));
let line_c = new Line(vec3(2,-1.5,0), vec3(3,1.5,0));
let line_d = new Line(vec3(0,-2,0), vec3(-1,1.5,0));

let lines = [line_a, line_b, line_c, line_d];

console.log(''+lines);

let bsp_line_a = new BSPLine(midpoint(vec3(0,0,0), vec3(2,0,0)), vec3(0,-1,0));
let bsp_line_b = new BSPLine(midpoint(vec3(0,-1,0), vec3(0,1,0)), vec3(-1,0,0));
let bsp_line_c = new BSPLine(midpoint(vec3(2,-1.5,0), vec3(3,1.5,0)), vec3(-1,1,0));
let bsp_line_d = new BSPLine(midpoint(vec3(0,-2,0), vec3(-1,1.5,0)), vec3(-1,-1,0));

let bsp_lines = [bsp_line_a, bsp_line_b, bsp_line_c, bsp_line_d];

console.log(''+bsp_lines);

console.log(''+bsp_line_a);
console.log(bsp_line_a.whichSide(vec3(0,0,0)));
console.log(bsp_line_a.whichSide(vec3(0,0.0001,0)));
console.log(bsp_line_a.whichSide(vec3(0,-0.0001,0)));


