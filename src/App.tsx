import { DefaultXRControllers, Interactive, useXR, useXREvent, VRCanvas } from '@react-three/xr'
import { Box, Plane } from 'drei/shapes'
import { OrbitControls } from 'drei/OrbitControls'
import { Text } from 'drei/Text'
import React, { useMemo, useState } from 'react'
import { useFrame } from 'react-three-fiber'
import { BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute, Vector3 } from 'three'

const count = 40_000
const stride = 10
const total = count * stride
const dots = new Float32Array(total)

const random = (min: number, max: number) => Math.random() * (max - min) + min

const offset = [0, 1.2, -0.4]
// Init
{
  let i
  for (i = 0; i < total; i += stride) {
    let d = 2
    let x = random(-1, 1) * d
    let y = random(-1, 1) * d
    let z = random(-1, 1) * d
    // home position
    dots[i] = x + offset[0]
    dots[i + 1] = y + offset[1]
    dots[i + 2] = z + offset[2] - 0.1
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

const setCube = () => {
  let i
  for (i = 0; i < total; i += stride) {
    let d = 0.1
    let x = random(-1, 1) * d
    let y = random(-1, 1) * d
    let z = random(-1, 1) * d - 0.1
    // home position
    dots[i] = x + offset[0]
    dots[i + 1] = y + offset[1]
    dots[i + 2] = z + offset[2]
  }
}

const sqCount = Math.sqrt(count)
const setSine = () => {
  let i
  let px = 0
  let py = 0
  for (i = 0; i < total; i += stride) {
    px++
    if (px >= sqCount) {
      py++
      px = 0
    }
    let d = 0.004
    let x = -px * d
    let y = Math.sin(((px - sqCount / 2) * (py - sqCount / 2)) / 300) / 32
    let z = -py * d
    // home position
    dots[i] = offset[0] + x + (sqCount * d) / 2
    dots[i + 1] = y + offset[1]
    dots[i + 2] = z + offset[2]
  }
}

const setSpiral = () => {
  let i
  let px = 0

  for (i = 0; i < total; i += stride) {
    px++

    let d = 0.00002
    let b = 0.001
    let r = 0.1
    let x = Math.sin(px * b) * r
    let y = px * d
    let z = Math.cos(px * b) * r
    // home position
    dots[i] = x + offset[0]
    dots[i + 1] = y + offset[1] - 0.6
    dots[i + 2] = z + offset[2]
  }
}

const setTriangle = () => {
  let i
  let px = 0
  let py = 0
  for (i = 0; i < total; i += stride) {
    px++
    if (px >= sqCount) {
      py++
      px = 0
    }

    let d = 0.003
    let y = (px & py) * d
    let x = -px * d + y / 2
    let z = -py * d + y / 2
    // home position
    dots[i] = x + offset[0] + 0.3
    dots[i + 1] = y + offset[1] - 0.2
    dots[i + 2] = z + offset[2] + 0.1
  }
}

const setEverywhere = () => {
  let i
  for (i = 0; i < total; i += stride) {
    let d = 1
    let x = random(-1, 1) * d
    let y = random(-1, 1) * d
    let z = random(-1, 1) * d - 0.1
    // home position
    dots[i] = x + offset[0]
    dots[i + 1] = y + offset[1]
    dots[i + 2] = z + offset[2]
  }
}
setCube()

const pointerL = {
  ignore: false,
  prev: new Vector3(),
  position: new Vector3(),
  force: 0
}

const pointerR = {
  ignore: false,
  prev: new Vector3(),
  position: new Vector3(),
  force: 0
}

const step = () => {
  let i
  for (i = 0; i < total; i += stride) {
    const pl = pointerL.position
    const dxl = pl.x - dots[i + 3]
    const dyl = pl.y - dots[i + 4]
    const dzl = pl.z - dots[i + 5]
    const distanceSquaredL = dxl * dxl + dyl * dyl + dzl * dzl

    if (pointerL.force > 0) {
      const powerMult = Math.max(Math.min(128, pointerL.prev.distanceTo(pointerL.position) * 256), 1)
      const dsq = (1 / (Math.max(0.1, distanceSquaredL) * 16)) * pointerL.force * powerMult

      dots[i + 6] += dxl * dsq
      dots[i + 7] += dyl * dsq
      dots[i + 8] += dzl * dsq
    } else if (distanceSquaredL < 0.01) {
      dots[i + 6] -= dxl * 16
      dots[i + 7] -= dyl * 16
      dots[i + 8] -= dzl * 16
    }

    const pr = pointerR.position
    const dxr = pr.x - dots[i + 3]
    const dyr = pr.y - dots[i + 4]
    const dzr = pr.z - dots[i + 5]
    const distanceSquaredR = dxr * dxr + dyr * dyr + dzr * dzr

    if (pointerR.force > 0) {
      const powerMult = Math.max(Math.min(128, pointerR.prev.distanceTo(pointerR.position) * 256), 1)
      const dsq = (1 / (Math.max(0.1, distanceSquaredR) * 16)) * pointerR.force * powerMult

      dots[i + 6] += dxr * dsq
      dots[i + 7] += dyr * dsq
      dots[i + 8] += dzr * dsq
    } else if (distanceSquaredR < 0.01) {
      dots[i + 6] -= dxr * 16
      dots[i + 7] -= dyr * 16
      dots[i + 8] -= dzr * 16
    }

    const returnForce = 0.045
    if (pointerL.force === 0 && pointerR.force === 0) {
      dots[i + 6] += (-dots[i + 3] + dots[i]) * returnForce
      dots[i + 7] += (-dots[i + 4] + dots[i + 1]) * returnForce
      dots[i + 8] += (-dots[i + 5] + dots[i + 2]) * returnForce
    }

    const hm = 0.982
    dots[i + 6] *= hm
    dots[i + 7] *= hm
    dots[i + 8] *= hm

    const r = pointerL.force === 0 && pointerR.force === 0 ? 0.0005 : 0.03
    dots[i + 6] += random(-r, r)
    dots[i + 7] += random(-r, r)
    dots[i + 8] += random(-r, r)

    // apply force
    dots[i + 3] += dots[i + 6] * dots[i + 9]
    dots[i + 4] += dots[i + 7] * dots[i + 9]
    dots[i + 5] += dots[i + 8] * dots[i + 9]
  }
}

function Button({ children, onSelect, position }: { children: string; onSelect: any; position: any }) {
  const [hover, setHover] = useState(false)

  return (
    <Interactive
      onSelect={onSelect}
      onHover={(e) => {
        setHover(true)
        const pointer = e.controller.inputSource.handedness === 'left' ? pointerL : pointerR
        pointer.ignore = true
      }}
      onBlur={(e) => {
        setHover(false)
        const pointer = e.controller.inputSource.handedness === 'left' ? pointerL : pointerR
        pointer.ignore = false
      }}>
      <Box args={[0.12, 0.05, 0.01]} position={position}>
        <meshPhongMaterial color={hover ? '#669' : '#666'} wireframe />
        <Text fontSize={0.03} position={[0, 0, 0.006]}>
          {children}
        </Text>
      </Box>
    </Interactive>
  )
}

function DotsRender() {
  const { buffer, geometry } = useMemo(() => {
    const geometry = new BufferGeometry()
    const buffer = new InterleavedBuffer(dots, stride)
    const position = new InterleavedBufferAttribute(buffer, 3, 3)
    const color = new InterleavedBufferAttribute(buffer, 3, 3)

    geometry.setAttribute('position', position)
    geometry.setAttribute('color', color)

    return { buffer, position, geometry }
  }, [])

  useFrame(() => {
    buffer.needsUpdate = true
  })

  return (
    <>
      <points frustumCulled={false}>
        <primitive object={geometry} attach="geometry" />
        <pointsMaterial size={0.0035} vertexColors sizeAttenuation={false} />
      </points>
      <group position={[0, 1, 0]} rotation={[-0.7, 0, 0]}>
        <Button position={[-0.2, 0, -0.3]} onSelect={() => setSine()}>
          wave
        </Button>
        <Button position={[0, 0, -0.3]} onSelect={() => setCube()}>
          cube
        </Button>
        <Button position={[0.2, 0, -0.3]} onSelect={() => setSpiral()}>
          spiral
        </Button>
        <Button position={[0.4, 0, -0.3]} onSelect={() => setTriangle()}>
          triangle
        </Button>
        <Button position={[-0.4, 0, -0.3]} onSelect={() => setEverywhere()}>
          random
        </Button>
      </group>
    </>
  )
}

function Dots() {
  const { controllers } = useXR()

  useXREvent('selectstart', (e) => {
    const pointer = e.controller.inputSource.handedness === 'left' ? pointerL : pointerR

    if (pointer.ignore) return

    pointer.force = 1
    pointer.prev.copy(e.controller.controller.position)
    pointer.position.copy(e.controller.controller.position)
  })
  useXREvent('selectend', (e) => {
    const pointer = e.controller.inputSource.handedness === 'left' ? pointerL : pointerR
    pointer.force = 0
  })

  useFrame(() => {
    controllers.forEach(({ inputSource, controller }) => {
      const pointer = inputSource.handedness === 'left' ? pointerL : pointerR
      pointer.prev.copy(pointer.position)
      pointer.position.copy(controller.position)
    })

    step()
  })

  return null
}

export function App() {
  return (
    <>
      <div id="intro">
        <h1>WebXR Particles</h1>
        <p>Hold trigger to pull particles</p>
      </div>
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
        <color args={[0x000000] as any} attach="background" />
      </VRCanvas>
    </>
  )
}
