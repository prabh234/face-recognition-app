// src/lib/face-matcher.ts
import { FaceMatcher } from 'face-api.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createFaceMatcher(): Promise<FaceMatcher> {
  const users = await prisma.user.findMany({
    include: { faces: true }
  });

  const labeledDescriptors = users.flatMap(user => 
    user.faces.map(face => ({
      label: user.id.toString(),
      descriptors: [new Float32Array(face.descriptor)]
    }))
  );

  return new FaceMatcher(labeledDescriptors);
}