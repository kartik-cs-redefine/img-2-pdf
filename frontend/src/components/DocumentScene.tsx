import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

function FloatingDocuments() {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const time = clock.getElapsedTime();
    group.current.rotation.y = time * 0.18;
    group.current.rotation.x = Math.sin(time * 0.45) * 0.08;
    group.current.position.y = Math.sin(time * 0.65) * 0.08;
  });

  return (
    <group ref={group} rotation={[0.25, -0.42, 0]}>
      <mesh position={[-0.35, 0.05, -0.24]} rotation={[0.04, 0.08, -0.12]}>
        <boxGeometry args={[1.35, 1.72, 0.08]} />
        <meshStandardMaterial color="#dfe9ff" roughness={0.65} />
      </mesh>
      <mesh position={[0.08, -0.04, 0]} rotation={[-0.04, -0.06, 0.08]}>
        <boxGeometry args={[1.35, 1.72, 0.1]} />
        <meshStandardMaterial color="#fbfcff" roughness={0.58} />
      </mesh>
      <mesh position={[0.08, 0.38, 0.07]}>
        <boxGeometry args={[0.75, 0.06, 0.025]} />
        <meshStandardMaterial color="#3268e8" />
      </mesh>
      <mesh position={[0.08, 0.15, 0.07]}>
        <boxGeometry args={[0.9, 0.035, 0.025]} />
        <meshStandardMaterial color="#bdc8dd" />
      </mesh>
      <mesh position={[0.08, -0.02, 0.07]}>
        <boxGeometry args={[0.62, 0.035, 0.025]} />
        <meshStandardMaterial color="#bdc8dd" />
      </mesh>
      <mesh position={[0.63, -0.56, 0.13]} rotation={[0, 0, -0.24]}>
        <boxGeometry args={[0.52, 0.52, 0.06]} />
        <meshStandardMaterial color="#f5bc6a" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function DocumentScene() {
  return (
    <div className="document-scene" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.3], fov: 34 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.8} />
        <directionalLight position={[3, 4, 5]} intensity={2.4} color="#ffffff" />
        <pointLight position={[-3, -2, 2]} intensity={3} color="#b8d1ff" />
        <FloatingDocuments />
      </Canvas>
    </div>
  );
}
