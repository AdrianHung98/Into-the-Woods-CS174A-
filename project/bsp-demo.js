import {defs, tiny} from './../examples/common.js';
// Pull these names into this module's scope for convenience:
const {vec3, vec4, vec, color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;
const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

const {hex_color} = tiny;

import {Shape_From_File} from './../examples/obj-file-demo.js'
import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './bsp-demo-shaders.js'


import {defs2} from './common-project.js';

const {Cube2} = defs2;

// 2D shape, to display the texture buffer
const Square =
    class Square extends tiny.Vertex_Buffer {
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
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1.0, diffusivity: .6, color: hex_color("#ffffff")}),
            planet1: new Material(new defs.Phong_Shader(),
                {ambient: .0, diffusivity: .6, color: hex_color("#808080")}),
            floor: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(1, 1, 1, 1), ambient: .3, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
                color_texture: null,
                light_depth_texture: null
            }),
        }


        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
    }


    render_scene(context, program_state) {
        //
        // Perform all necessary calculations here:
        //
        const t = this.t = program_state.animation_time / 1000;
        const dt = this.dt = program_state.animation_delta_time / 1000;

        let radius = 2;
        let light_size = 10**radius;
        let sun_color = hex_color('#FFFF00');
        let sun_pos = vec3(-10, 5, -10);

        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(vec4(sun_pos[0],sun_pos[1],sun_pos[2],1), hex_color('#FFFF00'), light_size)];


        // do objects
        let model_transform = Mat4.identity()
            .times(Mat4.translation(sun_pos[0], sun_pos[1], sun_pos[2]))       // step 2:  move
            .times(Mat4.scale(radius, radius, radius))   // step 1:  scale
        ;
        this.shapes.sun.draw(context, program_state, model_transform, this.materials.sun.override({color: sun_color}));

        model_transform = Mat4.identity()
            .times(Mat4.translation(sun_pos[0], sun_pos[1], sun_pos[2]))  // Step 3. Translate to sun position
            .times(Mat4.rotation(t, 0, 1, 0))  // Step 2.  rotate about sun.
            .times(Mat4.translation(5, 0, 0))  // Step 1. Translate to dist from sun.
        ;
        this.shapes.planet1.draw(context, program_state, model_transform, this.materials.planet1);

        // draw ground
        let model_trans_floor = Mat4.scale(8, 0.1, 5);
        this.shapes.cube.draw(context, program_state, model_trans_floor, this.materials.floor);
    }


    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);


        // Render scene
        this.render_scene(context, program_state);
    }

}





