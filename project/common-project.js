import {tiny} from '../tiny-graphics.js';
import {widgets} from '../tiny-graphics-widgets.js';
// Pull these names into this module's scope for convenience:
const {
    Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4,
    Light, Shape, Material, Shader, Texture, Scene
} = tiny;

Object.assign(tiny, widgets);

const defs2 = {};

export {defs2};

/**
 * Test our own defintiion using Square and Cube renamed to Square2 and Cube2
 */
const Square2 = defs2.Square =
    class Square2 extends Shape {
        // **Square** demonstrates two triangles that share vertices.  On any planar surface, the
        // interior edges don't make any important seams.  In these cases there's no reason not
        // to re-use data of the common vertices between triangles.  This makes all the vertex
        // arrays (position, normals, etc) smaller and more cache friendly.
        constructor() {
            super("position", "normal", "texture_coord");
            // Specify the 4 square corner locations, and match those up with normal vectors:
            this.arrays.position = Vector3.cast([-1, -1, 0], [1, -1, 0], [-1, 1, 0], [1, 1, 0]);
            this.arrays.normal = Vector3.cast([0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]);
            // Arrange the vertices into a square shape in texture space too:
            this.arrays.texture_coord = Vector.cast([0, 0], [1, 0], [0, 1], [1, 1]);
            // Use two triangles this time, indexing into four distinct vertices:
            this.indices.push(0, 1, 2, 1, 3, 2);
        }
    }
const Cube2 = defs2.Cube2 =
    class Cube2 extends Shape {
        // **Cube** A closed 3D shape, and the first example of a compound shape (a Shape constructed
        // out of other Shapes).  A cube inserts six Square strips into its own arrays, using six
        // different matrices as offsets for each square.
        constructor() {
            super("position", "normal", "texture_coord");
            // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 2; j++) {
                    const square_transform = Mat4.rotation(i == 0 ? Math.PI / 2 : 0, 1, 0, 0)
                        .times(Mat4.rotation(Math.PI * j - (i == 1 ? Math.PI / 2 : 0), 0, 1, 0))
                        .times(Mat4.translation(0, 0, 1));
                    // Calling this function of a Square (or any Shape) copies it into the specified
                    // Shape (this one) at the specified matrix offset (square_transform):
                    Square2.insert_transformed_copy_into(this, [], square_transform);
                }
        }
    }


