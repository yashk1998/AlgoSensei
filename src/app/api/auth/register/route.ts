import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { encodeEmail, downloadJson, uploadJson, generateId } from "@/lib/azure-storage";

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const blobPath = `users/${encodeEmail(email)}.json`;
    const existingUser = await downloadJson(blobPath);

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await uploadJson(blobPath, {
      _id: generateId(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Registration successful" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error creating user" },
      { status: 500 }
    );
  }
}
