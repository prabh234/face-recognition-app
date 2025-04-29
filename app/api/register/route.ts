import { MyPrisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';

// interface RegisterRequest {
//   descriptor: Float32Array[];
// }
export const GET = async () => {
  const data = await MyPrisma.face.findMany();
  console.log(data);
  
  return NextResponse.json(data,{status:200})
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  // console.log(arr);
  console.log(data.descriptor);
  
  try {

    if (!data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const face = await MyPrisma.face.create({
      data: {
        descriptor:data.descriptor
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