import { DefaultXRControllers, useXREvent, VRCanvas, XRController } from '@react-three/xr'
import { Plane } from 'drei/shapes'
import { OrbitControls } from 'drei/OrbitControls'
import React, { useMemo, useRef } from 'react'
import { useFrame } from 'react-three-fiber'
import { BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute, Vector3 } from 'three'

const count = 50_000
const stride = 10
const total = count * stride
const dots = new Float32Array(total)

const random = (min: number, max: number) => Math.random() * (max - min) + min

const offset = [0, 1.2, -0.4]
// Init
{
  let i
  for (i = 0; i < total; i += stride) {
    let d = 0.05
    let x = random(-1, 1) * d
    let y = random(-1, 1) * d
    let z = random(-1, 1) * d
    // home position
    dots[i] = x + offset[0]
    dots[i + 1] = y + offset[1]
    dots[i + 2] = z + offset[2]
    // position
    dots[i + 3] = x + offset[0]
    dots[i + 4] = y + offset[1]
    dots[i + 5] = z + offset[2]
    // velocity
    dots[i + 6] = 0
    dots[i + 7] = 0
    dots[i + 8] = 0
    // damp
    dots[i + 9] = random(0.005, 0.008)
  }
}

const pointer = {
  prev: new Vector3(),
  position: new Vector3(),
  force: 0
}

const step = () => {
  let i
  for (i = 0; i < total; i += stride) {
    const p = pointer.position
    const dx = p.x - dots[i + 3]
    const dy = p.y - dots[i + 4]
    const dz = p.z - dots[i + 5]
    const distanceSquared = dx * dx + dy * dy + dz * dz

    if (pointer.force > 0) {
      const powerMult = Math.max(Math.min(128, pointer.prev.distanceTo(pointer.position) * 256), 1)
      const dsq = (1 / (Math.max(0.1, distanceSquared) * 16)) * pointer.force * powerMult

      dots[i + 6] += dx * dsq
      dots[i + 7] += dy * dsq
      dots[i + 8] += dz * dsq
    } else {
      dots[i + 6] += (-dots[i + 3] + dots[i]) * 0.01
      dots[i + 7] += (-dots[i + 4] + dots[i + 1]) * 0.01
      dots[i + 8] += (-dots[i + 5] + dots[i + 2]) * 0.01

      if (distanceSquared < 0.01) {
        dots[i + 6] -= dx * 2
        dots[i + 7] -= dy * 2
        dots[i + 8] -= dz * 2
      }
    }

    const hm = 0.982
    dots[i + 6] *= hm
    dots[i + 7] *= hm
    dots[i + 8] *= hm

    const r = 0.03
    dots[i + 6] += random(-r, r)
    dots[i + 7] += random(-r, r)
    dots[i + 8] += random(-r, r)

    // apply force
    dots[i + 3] += dots[i + 6] * dots[i + 9]
    dots[i + 4] += dots[i + 7] * dots[i + 9]
    dots[i + 5] += dots[i + 8] * dots[i + 9]
  }
}

function DotsRender() {
  const { buffer, geometry } = useMemo(() => {
    const geometry = new BufferGeometry()
    const buffer = new InterleavedBuffer(dots, stride)
    const position = new InterleavedBufferAttribute(buffer, 3, 3)
    const color = new InterleavedBufferAttribute(buffer, 3, 6)

    geometry.setAttribute('position', position)
    geometry.setAttribute('color', color)

    return { buffer, position, geometry }
  }, [])

  useFrame(() => {
    buffer.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial size={0.0001} vertexColors />
    </points>
  )
}

function Dots() {
  const controller = useRef<XRController>()

  useXREvent('selectstart', (e) => {
    controller.current = e.controller
    pointer.force = 1
    pointer.prev.copy(e.controller.controller.position)
    pointer.position.copy(e.controller.controller.position)
  })
  useXREvent('selectend', (e) => {
    if (e.controller === controller.current) pointer.force = 0
  })

  useFrame(() => {
    if (controller.current) {
      pointer.prev.copy(pointer.position)
      pointer.position.copy(controller.current.controller.position)
    }

    step()
  })

  return null
}

export function App() {
  return (
    <VRCanvas>
      <DefaultXRControllers />
      <Plane args={[55, 55, 25, 25]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshPhongMaterial color="#222" attach="material" wireframe />
      </Plane>
      <OrbitControls />
      <Dots />
      <ambientLight />
      <DotsRender />
      <pointLight position={[10, 10, 10]} />
      <color args={[0x000000]} attach="background" />
    </VRCanvas>
  )
}
