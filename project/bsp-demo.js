import {defs, tiny} from './../examples/common.js';
// Pull these names into this module's scope for convenience:
const {vec3, vec4, vec, color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;
const {Square, Capped_Cylinder, Closed_Cone, Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere}
    = defs

const {hex_color} = tiny;

import {Shape_From_File} from './../examples/obj-file-demo.js'
import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './bsp-demo-shaders.js'


import {defs2} from './common-project.js';

const {Cube2} = defs2;

import {bsp} from './bsp.js';



// 2D shape, to display the texture buffer
const Square2 =
    class Square2 extends tiny.Vertex_Buffer {
        constructor() {
            super("position", "normal", "texture_coord");
            this.arrays.position = [
                vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0),
                vec3(1, 1, 0), vec3(1, 0, 0), vec3(0, 1, 0)
            ];
            this.arrays.normal = [
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
            ];
            this.arrays.texture_coord = [
                vec(0, 0), vec(1, 0), vec(0, 1),
                vec(1, 1), vec(1, 0), vec(0, 1)
            ]
        }
    }

const TreeShape0 =
    class TreeShape0 extends Shape {
        constructor() {
            super("position", "normal", "texture_coord");
            this.tree_w = 0.25;
            this.tree_d = 0.25;
            this.tree_h = 1.00;
            this.tree_r = 0.75;
            this.draw_stem();
            this.draw_leaf();
        }

        draw_stem() {
            Cube.insert_transformed_copy_into(this, [], Mat4.identity()
                .times(Mat4.translation(0, this.tree_h, 0))
                .times(Mat4.scale(this.tree_w, this.tree_h, this.tree_d))
            );
        }

        draw_leaf() {
            Subdivision_Sphere.insert_transformed_copy_into(this, [4], Mat4.identity()
                .times(Mat4.translation(0, this.tree_h*2, 0))
                .times(Mat4.scale(this.tree_r, this.tree_r, this.tree_r))
            );
        }
    }

const ArrowShape =
    class ArrowShape extends Shape {
        constructor() {
            super("position", "normal", "texture_coord");
            this.line_u = 0.25;
            this.draw_normal();
        }

        draw_normal() {
            Capped_Cylinder.insert_transformed_copy_into(this, [4, 10, [0,1]], Mat4.identity()
                .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                .times(Mat4.scale(0.1, 0.1, 2.0))
            );
            Closed_Cone.insert_transformed_copy_into(this, [4, 10, [0,1]], Mat4.identity()
                .times(Mat4.translation(0, 1.0, 0))
                .times(Mat4.rotation(-Math.PI/2, 1, 0, 0))
                .times(Mat4.scale(.3, .3, .3))
            );
        }
    }

const CameraShape =
    class CameraShape extends Shape {
        constructor() {
            super("position", "normal", "texture_coord");
            this.draw_body();
//            this.draw_dir(); // we render this separately so that it can be rotated along pitch
                               // without having to rotate the entire player along the pitch
        }

        draw_body() {
            TreeShape0.insert_transformed_copy_into(this, [], Mat4.identity()
                .times(Mat4.translation(0, 0, 0))
                .times(Mat4.scale(0.75, 0.75, 0.75))
            );
        }

        draw_dir() {
            ArrowShape.insert_transformed_copy_into(this, [], Mat4.identity()
                .times(Mat4.translation(1.0, 1.0, 0))
                .times(Mat4.rotation(-Math.PI/2, 0, 0, 1))
            );
        }
    }


const Tree =
    class Tree {
        constructor(x, y, z, tag='') {
            //console.log('creating tree: x: ' + x + ', y: ' + y + ', z: ' + z);
            this.p = vec3(x, y, z);
            this.tag = tag;
            this.type = 'tree';
            this.material = 'tree';

            // add p1, p2 for whichSide_lseg support
            this.p1 = vec3(this.p[0]-0.25, this.p[1], this.p[2]);
            this.p2 = vec3(this.p[0]+0.25, this.p[1], this.p[2]);
        }
        toString() {
            let msg = '{tree ' + this.tag + ': p: [' + this.p[0] + ', ' + this.p[1] + ', ' + this.p[2] + ']}';
            return msg;
        }
    }


const Cloud =
    class Cloud {
        constructor(x, y, z, tag='') {
            //console.log('creating cloud: x: ' + x + ', y: ' + y + ', z: ' + z);
            this.p = vec3(x, y, z);
            this.tag = tag;
            this.type = 'cloud';
            this.material = 'cloud';

            // add p1, p2 for whichSide_lseg support
            this.p1 = vec3(this.p[0]-0.25, this.p[1], this.p[2]);
            this.p2 = vec3(this.p[0]+0.25, this.p[1], this.p[2]);
        }
        toString() {
            let msg = '{cloud ' + this.tag + ': p: [' + this.p[0] + ', ' + this.p[1] + ', ' + this.p[2] + ']}';
            return msg;
        }
    }


const Camera =
    class Camera {
        //
        // Note that the three params to Mat4.lookat are are points, NOT vectors.
        // ie, 'lookat' is the lookat point in WS, not an actual direction vector.
        //
        // This camera trakcs its own position (eye), direction vector (front) = lookat_point - eye, and up vector.
        //
        // eye: point
        // front: vector
        // up: vector
        //
        constructor(eye, yaw, pitch, up, fov, tag) {
            this.eye = eye;
            this.up = up;
            this.tag = tag;

            this.fov = fov;

            this.yaw = yaw;
            this.pitch = pitch;

            this.update_eulers();

            this._matrix = Mat4.look_at(this.eye, this.eye.plus(this.front), this.up);
        }
        matrix() {
//            console.log("camera.matrix(): this.eye: " + this.eye[0] + ', ' + this.eye[1] + ', ' + this.eye[2]);
            this._matrix.set(Mat4.look_at(this.eye, this.eye.plus(this.front), this.up));
            return this._matrix;
        }
        inverse() {
            return Mat4.inverse(this._matrix);
        }
        forward() {
            // this.eye = this.eye.plus( this.front );  // this changes y as well
            this.eye = vec3(
                this.eye[0] + this.front[0],
                this.eye[1],
                this.eye[2] + this.front[2]
            );
        }
        backward() {
            // this.eye = this.eye.minus( this.front ); // this changes y as well
            this.eye = vec3(
                this.eye[0] - this.front[0],
                this.eye[1],
                this.eye[2] - this.front[2]
            );
        }
        strafe_left() {
            this.eye = this.eye.minus(
                this.front.cross(this.up).normalized()
            );
        }
        strafe_right() {
            this.eye = this.eye.plus(
                this.front.cross(this.up).normalized()
            );
        }
        update_eulers() {
            let dir = vec3(
                Math.cos(this.yaw) * Math.cos(this.pitch),
                Math.sin(this.pitch),
                Math.sin(this.yaw) * Math.cos(this.pitch)
            );
            this.front = dir.normalized();
        }
        rot_left() {
            this.yaw -= 0.1;
            this.update_eulers();
        }
        rot_right() {
            this.yaw += 0.1;
            this.update_eulers();
        }
        rot_up() {
            this.pitch += 0.1;
            if (this.pitch > 0.78) {
                this.pitch = 0.78
            }
            this.update_eulers();
        }
        rot_down() {
            this.pitch -= 0.1;
            if (this.pitch < -0.78) {
                this.pitch = -0.78
            }
            this.update_eulers();
        }
        toString() {
            let msg = '{camera' + this.tag +
                ': eye: [' + this.eye[0] + ', ' + this.eye[1] + ', ' + this.eye[2] +
                '; lookat: [' + this.lookat[0] + ', ' + this.lookat[1] + ', ' + this.lookat[2] +
                '; up: [' + this.up[0] + ', ' + this.up[1] + ', ' + this.up[2] +
                '; thrust: [' + this.thrust[0] + ', ' + this.thrust[1] + ', ' + this.thrust[2] +
                '; rollY: [' + this.rollY +
                ']}';
            return msg;
        }
    }

function create_phong_of_color(r, g, b, a, amb=0.3, diffuse=0.6, spec=0.4) {
    return new Material(new Phong_Shader(), {
        color: color(r, g, b, a),
        ambient: amb, diffusivity: diffuse, specularity: spec, smoothness: 64,
        color_texture: null,
        light_depth_texture: null
    });
}

function getRandInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}


// The scene
export class Bsp_Demo extends Scene {
    constructor() {
        super();
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            sun: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(4),
            planet1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
            cube: new Cube(),
            square_2d: new Square2(),
            floor: new Cube(),
            tree0: new TreeShape0(),
            arrow: new ArrowShape(),
            camera: new CameraShape(),
            tree1: new Shape_From_File("assets/LowPolyTree/lowpolytree.obj"),
            square: new Square(),
            cloud: new Shape_From_File("assets/cloud.obj"),
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1.0, diffusivity: .6, color: hex_color("#ffffff")}),
            planet1: new Material(new defs.Phong_Shader(),
                {ambient: .0, diffusivity: .6, color: hex_color("#808080")}),
            gray: create_phong_of_color(1, 1, 1, 1),
            red: create_phong_of_color(1, 0, 0, 1),
            green: create_phong_of_color(0, 1, 0, 1),
            blue: create_phong_of_color(0, 0, 1, 1),
            yellow: create_phong_of_color(1, 1, 0, 1),
            purple: create_phong_of_color(1, 0, 1, 1),
            cyan: create_phong_of_color(0, 1, 1, 1),
            dark_red: create_phong_of_color(0.6, 0.1, 0.1, 1),
            dark_green: create_phong_of_color(0.1, 0.6, 0.1, 1),
            dark_blue: create_phong_of_color(0.1, 0.1, 0.6, 1),
            dark_yellow: create_phong_of_color(0.6, 0.6, 0.1, 1),
            dark_purple: create_phong_of_color(0.6, 0.1, 0.6, 1),
            dark_cyan: create_phong_of_color(0.1, 0.6, 0.6, 1),
            transparent_yellow: create_phong_of_color(1, 1, 0, 0.1),
            //cloudy_blue: create_phong_of_color(0.62, 0.76, 0.85, 1),
            cloudy_blue: create_phong_of_color(0.74, 0.96, 1, 1),

            ground: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 0.7, diffusivity: 0.7, specularity: 0.1,
                texture: new Texture("assets/ground.jpg", "LINEAR_MIPMAP_LINEAR")
            }),
            tree: create_phong_of_color(0.1, 0.6, 0.1, 1, 0.5, 0.6, 0.4),
            cloud: create_phong_of_color(0.65, 0.95, 0.95, 1),
        }

        this.colors = [
            this.materials.gray,
            this.materials.red, this.materials.green, this.materials.blue,
            this.materials.yellow, this.materials.purple, this.materials.cyan,
            this.materials.dark_red, this.materials.dark_green, this.materials.dark_blue,
            this.materials.dark_yellow, this.materials.dark_purple, this.materials.dark_cyan,
        ];

        // lookat(eye, at, up) , see Dis w3-c page 27
        this.global_camera_location = Mat4.look_at(vec3(10, 20, 45), vec3(10, 1, 0), vec3(0, 1, 0));

        this.mm_camera_location = Mat4.look_at(vec3(0, 50, 0), vec3(0, 0, 0), vec3(0, 0, -1));

        this.switch_camera = false;
        this.cur_camera = 0;
        this.camera = new Camera(vec3(0, 1, 15), -Math.PI/2, 0, vec3(0, 1, 0), 45);

        this.cur_lod = 1;

        // object list of trees
        this.trees = [];
        this.TREE_ID = 0;

        // let there be trees
        this.create_trees(-20, 0, 0);
        this.create_trees(0, 0, 0);
        this.create_trees(20, 0, 0);

        // object list of static clouds
        this.static_clouds = [];
        this.STATIC_CLOUD_ID = 0;
        // create clouds
        this.static_clouds = this.static_clouds.concat(
            this.create_clouds(3, 20, 10, -10, this.STATIC_CLOUD_ID)
        );
        this.STATIC_CLOUD_ID += 3;

        // object list of clouds that will go into the bsp
        this.clouds = [];
        this.CLOUD_ID = 0;
        this.clouds = this.clouds.concat(
            this.create_clouds(3, 0, 8, -10, this.CLOUD_ID),
            this.create_clouds(2, 5, 7, -3, this.CLOUD_ID+3)
        );
        this.CLOUD_ID += 5;

        // zoom the floor out
        for (let i = 0; i < this.shapes.floor.arrays.texture_coord.length; i++) {
            let coord = this.shapes.floor.arrays.texture_coord[i];

            this.shapes.floor.arrays.texture_coord[i][0] = coord[0]*25;
            this.shapes.floor.arrays.texture_coord[i][1] = coord[1]*25;
        }
        console.log(this.shapes.floor.arrays.texture_coord);


        // bsp
//        this.cur_bsp_mode = 0;
        this.bsp_on = false;
        this.bsp_coloring = false;
        this.bsp_cull_level = 0;
        this.bsp_cull_dist = 4;

        this.bsp_root = new bsp.BSPNode([], vec3(-1,0,0));
        this.bsp_root.color = 0;
        this.bsp_divider = new bsp.BSPDivider();
        this.bsp_query = new bsp.BSPQuery();

        for (let tree of this.trees) {
            this.bsp_root.push(tree);
        }

        for (let cloud of this.clouds) {
            this.bsp_root.push(cloud);
        }

        console.log(''+this.bsp_root);

        // mini map
        this.mm_height = 125;
        this.mm_width = 125;
    }

    /**
     * Create a clump of trees starting at the given x,y,z position
     */
    create_trees(x, y, z) {
        let n = 5;
        let m = 5;
        let TREE_W = this.shapes.tree0.tree_w;
        let TREE_D = this.shapes.tree0.tree_d;
        let TREE_SP_X = 2;
        let TREE_SP_Z = 1.0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                this.trees.push(new Tree(x+i*(2*TREE_W+TREE_SP_X), y, z+j*(2*TREE_D+TREE_SP_Z), this.TREE_ID));
                this.TREE_ID += 1;
            }
        }
    }

    /**
     * Create n clouds centered around x, y, z
     */
    create_clouds(n, x, y, z, id) {
        let objs = [];
        for (let i = 0; i < n; i++) {
            objs.push(new Cloud(x+getRandInt(-2,2), y+getRandInt(-2,2), z+getRandInt(-2,2), id+i));
        }
        return objs;
    }


    split_bsp() {
        this.bsp_divider.divide(this.bsp_root, 1);
        console.log('' + this.bsp_root);

        // go through and assign a color-material to every cell
        let color_idx = 0;
        let stack = [this.bsp_root];
        while (stack.length > 0) {
            let node = stack.shift();
            console.log('assigned color: ' + color_idx);
            node.color = color_idx;
            color_idx = (color_idx+1) % this.colors.length;
            if (node.front) {
                stack.push(node.front);
            }
            if (node.back) {
                stack.push(node.back);
            }
        }
    }

    toggle_bsp() {
        this.bsp_on = ! this.bsp_on;
    }

    get_camera_pos() {
        return this.camera.eye;
    }

    get_camera_lookat() {
        return this.camera.eye.plus(this.camera.front);
    }

    get_camera_dir() {
        return this.camera.front;
    }

    next_camera() {
        this.switch_camera = true;
        this.cur_camera = (this.cur_camera+1) % 2;
        console.log('cur_camera: ' + this.cur_camera);
    }

    camera_func_call(func) {
        return () => this.camera[func]();
    }

    cur_camera_name() {
        if (this.cur_camera == 0) return 'GLOBAL';
        else if (this.cur_camera == 1) return 'LOCAL';
        else return '<error>';
    }

    next_lod() {
        this.cur_lod = (this.cur_lod+1) % 2;
        console.log('cur_lod: ' + this.cur_lod);
    }

    toggle_bsp_coloring() {
        this.bsp_coloring = ! this.bsp_coloring;
        console.log('bsp_coloring: ' + this.bsp_coloring);
    }

    cur_bsp_cull_level() {
        if (this.bsp_cull_level == 0) return '0: front, fov, no distance';
        else if (this.bsp_cull_level == 1) return '1: front, fov, distance: ' + this.bsp_cull_dist;
        else return '<error>';
    }

    next_bsp_cull_level() {
        this.bsp_cull_level = (this.bsp_cull_level+1) % 2;
        console.log('cur_bsp_cull_level: ' + this.bsp_cull_level);
    }

    make_control_panel() {
        this.key_triggered_button("Display using BSP", ["b"], this.toggle_bsp);
        this.key_triggered_button("Split BSP once", ["n"], this.split_bsp);
        this.new_line();
        this.new_line();
        this.control_panel.innerHTML += "Click to change settings:<br>";
        this.key_triggered_button("Cycle BSP cull level", ["c"], this.next_bsp_cull_level);
        this.live_string(box => box.textContent = "- Current BSP cull level: " + this.cur_bsp_cull_level());
        this.new_line();
        this.key_triggered_button("Toggle BSP coloring", ["g"], this.toggle_bsp_coloring);
        this.live_string(box => box.textContent = "- BSP coloring: " + this.bsp_coloring);
        this.new_line();
        this.key_triggered_button("Cycle LOD", ["u"], this.next_lod);
        this.live_string(box => box.textContent = "- Current LOD: " + this.cur_lod);
        this.new_line();
        this.key_triggered_button("Cycle cameras", ["t"], this.next_camera);
        this.live_string(box => box.textContent = "- Current camera: " + this.cur_camera_name());
        this.new_line();
        this.new_line();
        this.new_line();
        this.new_line();
        this.key_triggered_button("Move forward", ["i"], this.camera_func_call('forward'));
        this.key_triggered_button("Move backward", ["k"], this.camera_func_call('backward'));
        this.new_line();
        this.key_triggered_button("Strafe left", ["j"], this.camera_func_call('strafe_left'));
        this.key_triggered_button("Strafe right", ["l"], this.camera_func_call('strafe_right'));
        this.new_line();
        this.key_triggered_button("Rotate left", ["q"], this.camera_func_call('rot_left'));
        this.key_triggered_button("Rotate right", ["e"], this.camera_func_call('rot_right'));
        this.new_line();
        this.key_triggered_button("Rotate up", ["y"], this.camera_func_call('rot_up'));
        this.key_triggered_button("Rotate down", ["h"], this.camera_func_call('rot_down'));
    }

    render_player(context, program_state) {
        let mt_camera = Mat4.identity()
            .times(Mat4.translation(this.camera.eye[0], this.camera.eye[1], this.camera.eye[2]))
            .times(Mat4.rotation(-this.camera.yaw, 0, 1, 0))
//            .times(Mat4.rotation(this.camera.pitch, 0, 0, 1)) // don't rotate the player body along the pitch
        ;
        this.shapes.camera.draw(context, program_state, mt_camera, this.materials.gray);

        let mt_arrow = mt_camera
            .times(Mat4.translation(0, 1.5, 0))
            .times(Mat4.rotation(this.camera.pitch, 0, 0, 1))
            .times(Mat4.translation(1.0, 0.0, 0))
            .times(Mat4.rotation(-Math.PI/2, 0, 0, 1))
        ;
        this.shapes.arrow.draw(context, program_state, mt_arrow, this.materials.gray);

        let mt_fov_left = Mat4.identity()
            .times(Mat4.translation(this.camera.eye[0], this.camera.eye[1], this.camera.eye[2]))
            .times(Mat4.translation(-0.25, 1.5, 0))
            .times(Mat4.rotation(this.camera.fov * Math.PI/180, 0, 1, 0))
            .times(Mat4.rotation(this.camera.pitch, 1, 0, 0))
            .times(Mat4.rotation(-this.camera.yaw, 0, 1, 0))
            .times(Mat4.scale(25, 1, 1))
            .times(Mat4.translation(1, 0, 0))
        ;
        this.shapes.square.draw(context, program_state, mt_fov_left, this.materials.transparent_yellow);

        let mt_fov_right = Mat4.identity()
            .times(Mat4.translation(this.camera.eye[0], this.camera.eye[1], this.camera.eye[2]))
            .times(Mat4.translation(-0.25, 1.5, 0))
            .times(Mat4.rotation(-this.camera.fov * Math.PI/180, 0, 1, 0))
            .times(Mat4.rotation(this.camera.pitch, 1, 0, 0))
            .times(Mat4.rotation(-this.camera.yaw, 0, 1, 0))
            .times(Mat4.scale(25, 1, 1))
            .times(Mat4.translation(1, 0, 0))
        ;
        this.shapes.square.draw(context, program_state, mt_fov_right, this.materials.transparent_yellow);
    }

    render_tree(context, program_state, tree, material) {
        let mt_tree = Mat4.identity()
            .times(Mat4.translation(tree.p[0], tree.p[1], tree.p[2]))
        ;

        if (this.cur_lod == 1) {
            // move up the lowpolytree model a bit
            mt_tree = mt_tree.times(Mat4.translation(0, 1.5, 0));

            this.shapes.tree1.draw(context, program_state, mt_tree, material);
        }
        else {
            this.shapes.tree0.draw(context, program_state, mt_tree, material);
        }
    }

    render_cloud(context, program_state, cloud, material) {
        let mt_cloud = Mat4.identity()
            .times(Mat4.translation(cloud.p[0], cloud.p[1], cloud.p[2]))
        ;

        if (this.cur_lod == 1) {
            mt_cloud = mt_cloud.times(Mat4.scale(3, 3, 3));
            this.shapes.cloud.draw(context, program_state, mt_cloud, material);
        }
        else {
            this.shapes.cube.draw(context, program_state, mt_cloud, material);
        }
    }

    render_using_bsp(context, program_state) {
        let camera_pos = this.get_camera_pos();
        let camera_dir = this.get_camera_dir();
        let camera_fov = this.camera.fov;
        console.log('camera_pos: ' + camera_pos);
        console.log('camera_dir: ' + camera_dir);
        console.log('camera_fov: ' + camera_fov);

        let in_view_cells = this.bsp_query.in_fov_of(this.bsp_root, camera_pos, camera_dir, camera_fov);
        console.log('in_view_cells length: ' + in_view_cells.length);

        console.log('in_view_cells: ');
        console.log(in_view_cells);

        for (let node of in_view_cells) {
            for (let polyg of node.polygons) {
                if (this.bsp_cull_level == 1) {
                    let dist = bsp.dist(camera_pos, polyg.p);
                    //console.log('render_using_bsp: dist: ' + dist);
                    if (dist > this.bsp_cull_dist) {
                        continue;
                    }
                }

                if (polyg.type == 'tree') {
                    this.render_tree(context, program_state, polyg,
                        this.bsp_coloring ? this.colors[node.color] : this.materials[polyg.material]);
                }
                else if (polyg.type == 'cloud') {
                    this.render_cloud(context, program_state, polyg,
                        this.bsp_coloring ? this.colors[node.color] : this.materials[polyg.material]);
                }
            }
        }

        // render bsp cell centers:
        let stack = [this.bsp_root];
        while (stack.length > 0) {
            let node = stack.shift();
            if (node.center) {
                let mt_center = Mat4.identity()
                    .times(Mat4.translation(node.center[0], node.center[1]+2, node.center[2]))
                ;
                this.shapes.sphere.draw(context, program_state, mt_center, this.colors[node.color]);
            }
            if (node.front) {
                stack.push(node.front);
            }
            if (node.back) {
                stack.push(node.back);
            }
        }

    }

    render_scene(context, program_state, camera) {
        //
        // Perform all necessary calculations here:
        //
        const t = this.t = program_state.animation_time / 1000;
        const dt = this.dt = program_state.animation_delta_time / 1000;

        let radius = 1.5;
        let light_size = 10**radius;
        let sun_color = hex_color('#FFFF00');
        let sun_pos = vec3(-10, 10, -10);

        // The parameters of the Light are: position, color, size
//        program_state.lights = [new Light(vec4(sun_pos[0],sun_pos[1],sun_pos[2],1), hex_color('#FFFF00'), light_size)];

        // The position of the light
        //this.light_position = this.light_position = vec4(-3, 6, 3, 1);
        this.light_position = this.light_position = vec4(0, 10, 10, 1);
        //this.light_position = Mat4.rotation(t / 1500, 0, 1, 0).times(vec4(3, 6, 0, 1));
        // The color of the light
        this.light_color = color(1, 1, 1, 1);

        // This is a rough target of the light.
        // Although the light is point light, we need a target to set the POV of the light
        this.light_view_target = vec4(0, 0, 0, 1);
        this.light_field_of_view = 130 * Math.PI / 180; // 130 degree

        program_state.lights = [new Light(this.light_position, this.light_color, 1000)];


        // do objects
        let mt_sun = Mat4.identity()
            .times(Mat4.translation(sun_pos[0], sun_pos[1], sun_pos[2]))       // step 2:  move
            .times(Mat4.scale(radius, radius, radius))   // step 1:  scale
        ;
        this.shapes.sun.draw(context, program_state, mt_sun, this.materials.sun.override({color: sun_color}));

        let mt_planet = Mat4.identity()
            .times(Mat4.translation(sun_pos[0], sun_pos[1], sun_pos[2]))  // Step 3. Translate to sun position
            .times(Mat4.rotation(t, 0, 1, 0))  // Step 2.  rotate about sun.
            .times(Mat4.translation(5, 0, 0))  // Step 1. Translate to dist from sun.
        ;
        this.shapes.planet1.draw(context, program_state, mt_planet, this.materials.planet1);

        // draw ground
        let mt_floor = Mat4.scale(30, 0.1, 20);
        if (this.cur_lod == 0) {
            this.shapes.floor.draw(context, program_state, mt_floor, this.materials.gray);
        }
        else {
            this.shapes.floor.draw(context, program_state, mt_floor, this.materials.ground);
        }

        // draw static clouds
        for (let cloud of this.static_clouds) {
            let mt_cloud = Mat4.identity()
                .times(Mat4.translation(cloud.p[0], cloud.p[1], cloud.p[2]))
                .times(Mat4.scale(3, 3, 3))
            ;
            this.shapes.cloud.draw(context, program_state, mt_cloud, this.materials.cloudy_blue);
        }

        // draw player
        if (camera != 1) {
            this.render_player(context, program_state);
        }

        // draw bsp objs
        if (this.bsp_on) {
            this.render_using_bsp(context, program_state);
        }
        else {
            for (let tree of this.trees) {
                this.render_tree(context, program_state, tree, this.materials[tree.material]);
            }
            for (let cloud of this.clouds) {
                this.render_cloud(context, program_state, cloud, this.materials[cloud.material]);
            }
        }
    }


    render_current_camera(context, program_state) {

    }


    display(context, program_state) {
        const t = program_state.animation_time;
        const gl = context.context;

        gl.enable(gl.SCISSOR_TEST);

        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.global_camera_location);
        }

//        if (this.switch_camera) {
//            this._prev_camera_transform = context.scratchpad.controls.inverse();
////            console.log('prev camera transform');
////            console.log(this._prev_camera_transform);
//            if (this.cur_camera == 1) {
//                program_state.set_camera(this.camera.matrix());
//            }
//            else {
//                if (context.scratchpad.controls.matrix) {
//                    // common.js Movement_Controls applies a closure to modify the matrix, so this is saved here:
//                    program_state.set_camera(this.global_camera_location);
//                }
//            }
//            this.switch_camera = false;
//        }

        if (this.cur_camera == 0) {
            program_state.set_camera(this.global_camera_location);
        }
        else if (this.cur_camera == 1) {
            program_state.set_camera(this.camera.matrix());
        }

        // Draw to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//        program_state.view_mat = program_state.camera_inverse;

//        program_state.projection_transform = Mat4.perspective(
//            Math.PI / 4, context.width / context.height, .1, 1000);
//        console.log('context.width: ' + context.width + ', height: ' + context.height);
        if (this.cur_camera == 0) {
            program_state.projection_transform = Mat4.perspective(
                45 * (Math.PI/180), context.width / context.height, .1, 1000);
        }
        else if (this.cur_camera == 1) {
            program_state.projection_transform = Mat4.perspective(
                this.camera.fov * (Math.PI/180), context.width / context.height, .1, 1000);
        }

        // Render scene
        this.render_scene(context, program_state, this.cur_camera);

        // Render map
        gl.viewport(15, 5, this.mm_width, this.mm_height);
        gl.scissor(15, 5, this.mm_width, this.mm_height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        program_state.set_camera(this.mm_camera_location);
        this.render_scene(context, program_state, 3);

        // Render off-camera
        gl.viewport(15*2+this.mm_width, 5, this.mm_width, this.mm_height);
        gl.scissor(15*2+this.mm_width, 5, this.mm_width, this.mm_height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (this.cur_camera == 1) {
            program_state.set_camera(this.global_camera_location);
        }
        else if (this.cur_camera == 0) {
            program_state.set_camera(this.camera.matrix());
        }
        this.render_scene(context, program_state, 3);

    }

}





