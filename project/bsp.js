
// i had to use this commonjs before switching nodejs to use es6 syntax through package.json in this dir and parent dir.
//require('./tiny-graphics-copy.js');

import {tiny} from '../tiny-graphics.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, vec, color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;


export const bsp = {};

const midpoint = bsp.midpoint =
    function (p1, p2) {
        return vec3(
            (p1[0] + p2[0])/2,
            (p1[1] + p2[1])/2,
            (p1[2] + p2[2])/2,
        );
    }

const normalize = bsp.normalize =
    function (v) {
        let length = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        return vec3(
            v[0]/length,
            v[1]/length,
            v[2]/length
        );
    }

const add3 = bsp.add3 =
    function (v1, v2) {
        return vec3(
            v1[0] + v2[0],
            v1[1] + v2[1],
            v1[2] + v2[2]
        );
    }

const sub3 = bsp.sub3 =
    function (v1, v2) {
        return vec3(
            v1[0] - v2[0],
            v1[1] - v2[1],
            v1[2] - v2[2]
        );
    }

const dot = bsp.dot =
    function (v1, v2) {
        return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
    }

const rotY = bsp.rot =
    function (rads, v) {
        return Mat4.rotation(rads, 0, 1, 0).times(vec4(v[0], v[1], v[2], 0));
    }

const whichSide_point = bsp.whichSide_point =
    function (bsp_line, p1) {
        let dp = dot(sub3(p1, bsp_line.p), bsp_line.n);
        console.log('\t\tsub3(p1, bsp_line.p): ' + sub3(p1, bsp_line.p));
        if (dp > 0) return "front";
        else if (dp < 0) return "back";
        else return "collinear";
    }

const whichSide_lseg = bsp.whichSide_lseg =
    function (bsp_line, ls1) {
        let which1 = whichSide_point(bsp_line, ls1.p1);
        let which2 = whichSide_point(bsp_line, ls1.p2);

        if (which1 == "front" && which2 == "front") return "front";
        else if (which1 == "back" && which2 == "back") return "back";
        else if (which1 == "collinear" && which2 == "collinear") return "collinear";
        else return "both";
    }

const split_lseg = bsp.split_lseg =
    function (hyperplane, lseg) {
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

const split_obj = bsp.split_obj =
    function (hyperplane, obj) {
        //
        // Instead of actually splitting an object, we test which side of the hyperplane that the object's center point
        //    (however it is defined by the class creator) is on.
        //
        let side = whichSide_point(hyperplane, obj.p);
        if (side == "front") {
            return [obj, null];
        }
        else {
            return [null, obj];
        }
    }

const split = bsp.split =
    function (hyperplane, obj) {
        if (obj.constructor.name == "BSPLine") {
            // unsupported
        }
        else if (obj.constructor.name == "BSPLineSegment") {
            return split_lseg(hyperplane, obj);
        }
        else {
            return split_obj(hyperplane, obj);
        }
    }

const find_center = bsp.find_center =
    function (objs) {
            if (objs.length == 0) return vec3(0, 0, 0);

            let tot_x = 0, tot_y = 0, tot_z = 0;
            for (let obj of objs) {
                tot_x += obj.p[0];
                tot_y += obj.p[1];
                tot_z += obj.p[2];
            }
            let n = objs.length;
            return vec3(tot_x/n, tot_y/n, tot_z/n);
        }

const BSPLineSegment = bsp.BSPLineSegment =
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

const BSPLine = bsp.BSPLine =
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

const BSPNode = bsp.BSPNode =
    class BSPNode {
        constructor(polygons, normal) {
            console.log('creating bsp node');
            this.polygons = polygons;
            this.n = normal;

            this.center = find_center(polygons);
            this.hyperplane = new BSPLine(this.center, normal);
        }
        push(polygon) {
            this.polygons.push(polygon);
        }
        push_all(polygons) {
            this.polygons = this.polygons.concat(polygons);
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

const BSPDivider = bsp.BSPDivider =
    class BSPDivider {
        /**
         * Recursively subdivides using center of mass as next recursive call's hyperplane origin-position.
         */
        constructor(max_objs=5) {
            console.log('bsp divider constructor');
            this.max_objs = max_objs;
        }

        divide(node, depth=-1) {

            //
            // Base case:  a BSPNode is only a leaf if it has less polygons than the max per cell,
            //         AND it does not have further sub-nodes (children).
            //
            if (node.polygons.length < this.max_objs && !node.front && !node.back) {
                node.is_leaf = true;
                return;
            }

            let collinear = [], front = [], back = [];
            for (let polyg of node.polygons) {
                if (! node.hyperplane) {
                    // if the node has no hyperplane, uses the first polyg encountered in node.polygons as the hyperplane
                    node.hyperplane = new BSPLine(polyg.p, polyg.n, polyg.tag+'.hypp'); // TODO: assumes every polygon has a .p (center) and .n

                }

                let side = whichSide_lseg(node.hyperplane, polyg);
                console.log('polyg: ' + polyg + ', side: ' + side);

                if (side == "front") front.push(polyg);
                else if (side == "back") back.push(polyg);
                else if (side == "collinear") collinear.push(polyg);
                else if (side == "both") {
                    let [polyg_front, polyg_back] = split(node.hyperplane, polyg);
                    console.log('polyg_front: ' + polyg_front + ', polyg_back: ' + polyg_back);
                    if (polyg_front) {
                        front.push(polyg_front);
                    }
                    if (polyg_back) {
                        back.push(polyg_back);
                    }
                }
            }
            node.polygons = collinear;

            if (! node.front) {
                node.front = new BSPNode(front, rotY(Math.PI/2, node.n));
            }
            else {
                node.front.push_all(front);
            }

            if (! node.back) {
                node.back = new BSPNode(back, rotY(-Math.PI/2, node.n));
            }
            else {
                node.front.push_all(back);
            }

            // only decrease depth if polygons were actually separated out
            if (front.length > 0 || back.length > 0) {
                depth -= 1;
                console.log("decreased depth: " + depth);
            }

            if (depth == 0) return;

            this.divide(node.front, depth);
            this.divide(node.back, depth);
        }
    }


const BSPQuery = bsp.BSPQuery =
    class BSPQuery {
        constructor() {
        }

        //
        // Returns all cells in the bsp that are in front of the given {point, direction}.
        //
        in_front_of(node, point, dir, depth=0) {
            let cells = [];

            console.log('in_front_of: bsp_root.center: ' + node.center);
            console.log('\tpoint: ' + point + ', dir: ' + dir);
            console.log('\tdepth: ' + depth);
            let side = whichSide_point({p: point, n: dir}, node.center);
            console.log('\tside: ' + side);
            if (side == "front") {
                cells = [node];
                if (node.front) {
                    cells = cells.concat(this.in_front_of(node.front, point, dir, depth-1));
                }
                if (node.back) {
                    cells = cells.concat(this.in_front_of(node.back, point, dir, depth-1));
                }
            }

            return cells;
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

let bsp_divider = new BSPDivider(3);

let a = new BSPNode([], vec(-1,0,0));
a.push(lseg_a);
a.push(lseg_b);
a.push(lseg_c);
a.push(lseg_d);

console.log(''+a);

bsp_divider.divide(a, -1);

console.log(''+a);

//bsp_divider.divide(a, -1);
//
//console.log(''+a);

