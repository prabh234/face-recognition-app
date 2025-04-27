import { MyPrisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';

// interface RegisterRequest {
//   descriptor: Float32Array[];
// }
export const GET = async () => {
  const data = await MyPrisma.face.findMany();
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  // const arr = new Float32Array(data)
  // console.log(arr);
  console.log(data);
  
  try {

    if (!data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const face = await MyPrisma.face.create({
      data: {
        descriptor:data
      }
    });

    return NextResponse.json({face},{status:200});
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}