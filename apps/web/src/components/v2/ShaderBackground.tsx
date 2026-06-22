'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Full-screen prism-light shader background, ported 1:1 from the mock's GLSL.
 * Pixel ratio capped at 1.4, paused while the tab is hidden. Reduced motion
 * renders a single static frame. Mounted only on capable/large viewports by
 * ShaderMount; the CSS scrim + dot-grid stay as a fallback underneath.
 */
export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4))

    const scene = new THREE.Scene()
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const uniforms = {
      u_time: { value: 0 },
      u_res: { value: new THREE.Vector2() },
      u_mouse: { value: new THREE.Vector2(0, 0) },
    }

    const frag = `
      precision highp float;
      uniform float u_time; uniform vec2 u_res; uniform vec2 u_mouse;
      float hash(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
      float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<6;i++){v+=a*noise(p);p=p*2.0+1.3;a*=0.5;}return v;}
      void main(){
        vec2 p=(gl_FragCoord.xy*2.0-u_res)/u_res.y;
        float t=u_time*0.05;
        vec2 m=u_mouse*0.5;
        vec2 q=vec2(fbm(p*1.1+t+m), fbm(p*1.1 - t + 4.2 - m));
        vec2 r=vec2(fbm(p*1.4+q*1.9+vec2(1.7,9.2)+t*0.6), fbm(p*1.4+q*1.9+vec2(8.3,2.8)-t*0.45));
        float f=fbm(p+r*2.0);
        vec3 c1=vec3(0.035,0.025,0.07);
        vec3 c2=vec3(0.49,0.36,0.96);
        vec3 c3=vec3(0.93,0.28,0.60);
        vec3 c4=vec3(0.13,0.83,0.93);
        vec3 col=mix(c1,c2,smoothstep(0.18,0.72,f));
        col=mix(col,c3,smoothstep(0.55,0.98,r.x)*0.9);
        col=mix(col,c4,smoothstep(0.62,1.0,r.y)*0.5);
        col*=0.32+0.7*f;
        float vig=smoothstep(1.5,0.15,length(p));
        col*=vig;
        col=pow(col,vec3(1.25));
        gl_FragColor=vec4(col,1.0);
      }`

    const mat = new THREE.ShaderMaterial({
      uniforms,
      fragmentShader: frag,
      vertexShader: 'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    scene.add(mesh)

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h, false)
      uniforms.u_res.value.set(
        w * renderer.getPixelRatio(),
        h * renderer.getPixelRatio()
      )
    }
    resize()
    window.addEventListener('resize', resize)

    let mx = 0
    let my = 0
    let cx = 0
    let cy = 0
    const onPointer = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2
      my = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', onPointer)

    let running = true
    const onVisibility = () => {
      running = !document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)

    const start = performance.now()
    let raf = 0
    const loop = (now: number) => {
      if (running) {
        cx += (mx - cx) * 0.05
        cy += (my - cy) * 0.05
        uniforms.u_mouse.value.set(cx, cy)
        uniforms.u_time.value = reduce ? 6.0 : (now - start) / 1000
        renderer.render(scene, cam)
      }
      if (!reduce) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    if (reduce) renderer.render(scene, cam)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      mesh.geometry.dispose()
      mat.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="gl" aria-hidden />
}
