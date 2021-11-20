
require('./tiny-graphics-copy.js');

// Pull these names into this module's scope for convenience:
const {vec3, vec4, vec, color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;


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

function add3(v1, v2) {
    return vec3(
        v1[0] + v2[0],
        v1[1] + v2[1],
        v1[2] + v2[2]
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
    if (dp > 0) return "front";
    else if (dp < 0) return "back";
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

function split_lseg(hyperplane, lseg) {
    console.log('splitting:  hyperplane: ' + hyperplane + ', line-segment: ' + lseg);

    // https://en.wikipedia.org/wiki/Line-plane_intersection
    let p0 = hyperplane.p;
    let l0 = lseg.p1;
    let l = sub3(lseg.p2, lseg.p1);
    let numerator = dot(sub3(p0, l0), hyperplane.n);
    let denominator = dot(l, hyperplane.n);
    let d = numerator / denominator;
    let p = add3(l0, vec3(d*l[0], d*l[1], d*l[2]));

    console.log('\t d: ' + d + ', p: [' + p + ']');

    let lseg1 = new BSPLineSegment(l0, p, lseg.n, lseg.tag+'.1');  // keep the same normal
    let lseg2 = new BSPLineSegment(p, lseg.p2, lseg.n, lseg.tag+'.2');

    return [lseg1, lseg2];
}

class BSPLineSegment {
    constructor(p1, p2, n, tag='') {
        this.p1 = p1;
        this.p2 = p2;
        this.n = normalize(n);
        this.p = midpoint(p1, p2);
        this.tag = tag;
    }
    toString() {
        return '{' + (this.tag == '' ? '' : this.tag + ': ')
            + 'p1: [' + this.p1 + '], p2: [' + this.p2 + '], normal: [' + this.n + '], p: [' + this.p + ']}';
    }
}

class BSPLine {
    constructor(p, n, tag='') {
        this.p = p;
        this.n = normalize(n);
        this.tag = tag;
    }
    toString() {
        return '{' + (this.tag == '' ? '' : this.tag + ': ')
            + 'p: [' + this.p + '], normal: [' + this.n + ']}';
    }
}

class BSPNode {
    constructor(polygons=[]) {
        console.log('creating bsp node');
        this.polygons = polygons;
    }
    push(polygon) {
        this.polygons.push(polygon);
    }
    toString() {
        let msg = '---->'.repeat(10) + '\n' + '***BSPNode***\n';
        if (this.polygons) msg += 'this.polygons:\n\t' + this.polygons.join('\n\t') + '\n';
        if (this.front) msg += 'this.front:\n\t' + this.front.toString().replace(/\n/g,'\n\t') + '\n';
        if (this.back) msg += 'this.back:\n\t' + this.back.toString().replace(/\n/g,'\n\t') + '\n';
        if (this.collinear) msg += 'this.collinear:\n\t' + this.collinear.toString().replace(/\n/g,'\n\t') + '\n';
        if (this.hyperplane) msg += 'this.hyperplane:\n\t' + this.hyperplane + '\n';
        return msg + '<----'.repeat(10);
    }
}

class BSPDivider {
    /**
     * Recursively subdivides all polygons.
     */
    constructor() {
        console.log('bsp divider constructor');
    }

    divide(node, depth=-1) {
        let collinear = [], front = [], back = [];
        for (let polyg of node.polygons) {
            if (! node.hyperplane) {
                // uses the first polyg encountered in node.polygons as the hyperplane
                node.hyperplane = new BSPLine(polyg.p, polyg.n, polyg.tag+'.hypp'); // TODO: assumes every polygon has a .p (center) and .n
            }

            let side = whichSide_lseg(node.hyperplane, polyg);
            console.log('polyg: ' + polyg + ', side: ' + side);

            if (side == "front") front.push(polyg);
            else if (side == "back") back.push(polyg);
            else if (side == "collinear") collinear.push(polyg);
            else if (side == "both") {
                let [polyg_front, polyg_back] = split_lseg(node.hyperplane, polyg);
                console.log('polyg_front: ' + polyg_front + ', polyg_back: ' + polyg_back);
                front.push(polyg_front);
                back.push(polyg_back);
            }
        }
        node.polygons = collinear;

        node.front = new BSPNode(front);
        node.back = new BSPNode(back);

        if (depth == 0) return;

        this.divide(node.front, depth-1);
        this.divide(node.back, depth-1);
    }
}


//
// Test lines and whichSide_point
//

let v = vec3(1,2,3);
console.log(v[1]);
console.log(''+v);

let bsp_line_a = new BSPLine(midpoint(vec3(0,0,0), vec3(2,0,0)), vec3(0,-1,0), 'line_a');
let bsp_line_b = new BSPLine(midpoint(vec3(0,-1,0), vec3(0,1,0)), vec3(-1,0,0), 'line_b');
let bsp_line_c = new BSPLine(midpoint(vec3(2,-1.5,0), vec3(3,1.5,0)), vec3(-1,1,0), 'line_c');
let bsp_line_d = new BSPLine(midpoint(vec3(0,-2,0), vec3(-1,1.5,0)), vec3(-1,-1,0), 'line_d');

let bsp_lines = [bsp_line_a, bsp_line_b, bsp_line_c, bsp_line_d];

console.log(''+bsp_lines);

console.log(''+bsp_line_a);
console.log(whichSide_point(bsp_line_a, vec3(0,0,0)));
console.log(whichSide_point(bsp_line_a, vec3(0,0.0001,0)));
console.log(whichSide_point(bsp_line_a, vec3(0,-0.0001,0)));

//
// Test line-segments and whichSide_lseg
//

let lseg_a = new BSPLineSegment(vec3(0,0,0), vec3(2,0,0), vec3(0,-1,0), 'lseg_a');
let lseg_b = new BSPLineSegment(vec3(0,-1,0), vec3(0,1,0), vec3(-1,0,0), 'lseg_b');
let lseg_c = new BSPLineSegment(vec3(2,-1.5,0), vec3(3,1.5,0), vec3(-1,1,0), 'lseg_c');
let lseg_d = new BSPLineSegment(vec3(0,-2,0), vec3(-1,1.5,0), vec3(-1,-1,0), 'lseg_d');

// lseg_a + (0,1,0):  should be behind hyperplane bsp_line_a
let lseg_a2 = new BSPLineSegment(vec3(0,1,0), vec3(2,1,0), vec3(0,-1,0), 'lseg_a2');
// lseg_a - (0,1,0):  should be in front of hyperplane bsp_line_a
let lseg_a3 = new BSPLineSegment(vec3(0,-1,0), vec3(2,-1,0), vec3(0,-1,0), 'lseg_a3');

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

let bsp_divider = new BSPDivider();

let a = new BSPNode();
a.push(lseg_a);
a.push(lseg_b);
a.push(lseg_c);
a.push(lseg_d);

console.log(''+a);

bsp_divider.divide(a, 1);

console.log(''+a);

