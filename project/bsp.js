
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

function whichSide_point(bsp_line, p1) {
    let dp = dot(sub3(p1, bsp_line.p), bsp_line.n);
    if (dp > 0) return "front"
    else if (dp < 0) return "back"
    else return "collinear";
}

function whichSide_lseg(bsp_line, ls1) {
    let which1 = whichSide_point(bsp_line, ls1.p1);
    let which2 = whichSide_point(bsp_line, ls1.p2);

    if (which1 == "front" && which2 == "front") return "front";
    else if (which1 == "back" && which2 == "back") return "back";
    else if (which1 == "collinear" && which2 == "collinear") return "collinear";
    else return "both";
}


class BSPLineSegment {
    constructor(p1, p2, n) {
        this.p1 = p1;
        this.p2 = p2;
        this.n = normalize(n);
    }
    toString() {
        return '{p1: [' + this.p1 + '], p2: [' + this.p2 + '], normal: [' + this.n + ']}';
    }
}

class BSPLine {
    constructor(p, n) {
        this.p = p;
        this.n = normalize(n);
    }
    toString() {
        return '{p: [' + this.p + '], normal: [' + this.n + ']}';
    }
}

class BSPNode {
    constructor(polygons=[]) {
        console.log('creating bsp node');
        this.polygons = polygons;
        this.hyperplane = new BSPLine(vec3(0,0,0), vec3(0,-1,0));
    }
    push(polygon) {
        this.polygons.push(polygon);
    }
}

class BSPDivider {
    /**
     * Recursively subdivides all polygons.
     */
    constructor() {
        console.log('bsp divider constructor');
    }

    divide(node) {
        let collinear = [], front = [], back = [];
        for (let polyg of node.polygons) {
            let side = whichSide_linesegment(node.hyperplane, polyg);

            if (side == "front") front.push(polyg);
            else if (side == "back") back.push(polyg);
            else if (side == "collinear") collienar.push(polyg);
            else if (side == "both") {
                polyg_front, polyg_back = split_linesegment(polyg);
                front.push(polyg_front);
                back.push(polyg_back);
            }
        }
        node.polygons = collinear;

        node.front = new BSPNode(front);
        node.back = new BSPNode(back);

        divide(node.front);
        divide(node.back);
    }
}


//
// Test lines and whichSide_point
//

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
console.log(whichSide_point(bsp_line_a, vec3(0,0,0)));
console.log(whichSide_point(bsp_line_a, vec3(0,0.0001,0)));
console.log(whichSide_point(bsp_line_a, vec3(0,-0.0001,0)));

//
// Test line-segments and whichSide_linesegment
//

let lseg_a = new BSPLineSegment(vec3(0,0,0), vec3(2,0,0), vec3(0,-1,0));
let lseg_b = new BSPLineSegment(vec3(0,-1,0), vec3(0,1,0), vec3(-1,0,0));
let lseg_c = new BSPLineSegment(vec3(2,-1.5,0), vec3(3,1.5,0), vec3(-1,1,0));
let lseg_d = new BSPLineSegment(vec3(0,-2,0), vec3(-1,1.5,0), vec3(-1,-1,0));

// lseg_a + (0,1,0):  should be behind hyperplane bsp_line_a
let lseg_a2 = new BSPLineSegment(vec3(0,1,0), vec3(2,1,0), vec3(0,-1,0));
// lseg_a - (0,1,0):  should be in front of hyperplane bsp_line_a
let lseg_a3 = new BSPLineSegment(vec3(0,-1,0), vec3(2,-1,0), vec3(0,-1,0));

let lsegs = [lseg_a, lseg_b, lseg_c, lseg_d];

console.log(''+lsegs);

console.log(whichSide_lseg(bsp_line_a, lseg_a));
console.log(whichSide_lseg(bsp_line_a, lseg_b));
console.log(whichSide_lseg(bsp_line_a, lseg_c));
console.log(whichSide_lseg(bsp_line_a, lseg_d));

console.log(whichSide_lseg(bsp_line_a, lseg_a2));
console.log(whichSide_lseg(bsp_line_a, lseg_a3));


//
// Test BSPNode and BSPDivider
//

//let bsp_divider = new BSPDivider();
//
//let a = new BSPNode();
//a.push(

//bsp_divider.divide(a);

