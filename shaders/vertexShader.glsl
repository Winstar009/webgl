attribute vec2 vertexPosition;
attribute vec3 vertexColor;

varying vec3 fragColor;

void main() {
    fragColor = vertexColor;
    gl_Position = vec4(vertexPosition, 0, 1);
    gl_PointSize = 2.0;
}