import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RegisterRequest {
  name: string;
  descriptor: number[];
}

export async function POST(req: Request) {
  try {
    const { name, descriptor } = await req.json() as RegisterRequest;
    
    if (!name || !descriptor) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        faces: {
          create: {
            descriptor: descriptor
          }
        }
      }
    });
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}