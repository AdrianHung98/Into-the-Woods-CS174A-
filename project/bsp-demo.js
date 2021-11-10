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
            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
            //sun: new defs.Subdivision_Sphere(4),
            sun: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(4),
            planet1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
            planet2: new defs.Subdivision_Sphere(3),
            planet3: new defs.Subdivision_Sphere(4),
            planet3_ring: new (defs.Torus.prototype.make_flat_shaded_version())(50, 50),
            planet4: new defs.Subdivision_Sphere(4),
            planet4_moon: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            ring: new Material(new Ring_Shader()),
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
            //        (Requirement 4)
            sun: new Material(new defs.Phong_Shader(),
                {ambient: 1.0, diffusivity: .6, color: hex_color("#ffffff")}),
            planet1: new Material(new defs.Phong_Shader(),
                {ambient: .0, diffusivity: .6, color: hex_color("#808080")}),
            planet2: new Material(new Gouraud_Shader(),
                {specularity: 1.0, ambient: .0, diffusivity: .3, color: hex_color("#80ffff")}),
            planet3: new Material(new defs.Phong_Shader(),
                {specularity: 1.0, ambient: .0, diffusivity: 1.0, color: hex_color("#b08040")}),
            planet3_ring: new Material(new Ring_Shader()),
            planet4: new Material(new defs.Phong_Shader(),
                {specularity: 1.0, ambient: .0, diffusivity: .6, color: hex_color("#3d3d90")}),
            planet4_moon: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#bf40bf")}),
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

        // period is 2*pi/w where w is pi/5, thus giving 10s period.
        let osc = Math.sin((Math.PI/5)*t);
        // sun
        let radius = 2+osc;
        let col_osc = (osc-(-1))/2.0;
        let sun_color = color(1, col_osc, col_osc, 1);
        // light
        let light_size = 10**radius;
        // planets
        let planet_radius = [5, 8, 11, 14];
        let planet_w = [1.0, 0.9, 0.75, 0.6];


        // do lighting
        const light_position = vec4(0, 0, 0, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, sun_color, light_size)];


        // do objects
        let model_transform = Mat4.identity();
        model_transform = model_transform.times(Mat4.scale(radius, radius, radius));
        this.shapes.sun.draw(context, program_state, model_transform, this.materials.sun.override({color: sun_color}));

        for (let i = 0; i < 4; i++) {
            let model_transform = Mat4.identity()
                .times(Mat4.rotation(planet_w[i]*t, 0, 1, 0))  // Step 2.  rotate about sun.
                .times(Mat4.translation(planet_radius[i], 0, 0))  // Step 1. Translate to dist from sun.
                ;
            let planet = this.shapes['planet'+(i+1)];
            let material = this.materials['planet'+(i+1)];

            if (i == 1) {
                material.gouraud = (Math.floor(t) % 2 == 1);
            }

            planet.draw(context, program_state, model_transform, material);

            // Requirement 5: camera buttons
            this['planet_'+(i+1)] = model_transform;  // store the model_transform matrix for planet_i

            if (i == 2) {
                let p3_ring = this.shapes['planet3_ring'];
                let ring_transform = model_transform
                    .times(Mat4.rotation(Math.sin(1.15*t), 1, 1, 1))
                    .times(Mat4.scale(2.5, 2.5, 0.2));
                material = this.materials['planet3_ring'];
                p3_ring.draw(context, program_state, ring_transform, material);
            }

            if (i== 3) {
                let p4_moon = this.shapes['planet4_moon'];
                let moon_transform = model_transform
                    .times(Mat4.rotation(0.5*planet_w[i]*t, 0, 1, 0)) // Step 2. rotate abount p4
                    .times(Mat4.translation(2.5, 0, 0)) // Step 1. Offset to orbital dist from p4
                    ;
                material = this.materials['planet4_moon'];
                p4_moon.draw(context, program_state, moon_transform, material);

                this.moon = moon_transform;
            }
        }

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



class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // assignment3 modifications:
        uniform bool use_gouraud;
        varying vec4 VERTEX_COLOR;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the
                // light will appear directional (uniform direction from all points), and we
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to
                // the point light's location from the current surface point.  In either case,
                // fade (attenuate) the light as the vector needed to reach it gets longer.
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz -
                                               light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );

                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;
            // Position is expressed in object coordinates.

            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;

            void main(){
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;

                if (use_gouraud) {
                    VERTEX_COLOR      = vec4( shape_color.xyz * ambient, shape_color.w);
                    VERTEX_COLOR.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                }
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){
                if (use_gouraud) {
                    gl_FragColor = VERTEX_COLOR;
                    return;
                }
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);

        // assignment3 modification:  add toggle for gouraud or phong shading
        gl.uniform1i(gpu.use_gouraud, material.gouraud);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main(){
            center = vec4(0, 0, 0, 1);
            point_position = vec4(position, 1);
            gl_Position = projection_camera_model_transform * vec4(position, 1);
//            point_position = model_transform * vec4(position, 1);
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
             vec4 ring_col = vec4(0.690, 0.502, 0.251, 1);  // #b08040 as vec4
             // 2pi/100 = T = period of sin wave pattern (# of rings). so increasing this param will incr # of rings
             gl_FragColor = sin(75.0 * distance(center, point_position)) * ring_col;
        }`;
    }
}



