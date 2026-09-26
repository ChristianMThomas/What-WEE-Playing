import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create account · WhatWiPlaying" };

export default function RegisterPage() {
  return (
    <section className="wii-panel w-full max-w-3xl p-8 sm:p-10">
      <h1 className="mb-6 text-center text-2xl font-extrabold">Make your player</h1>
      <RegisterForm />
      <p className="mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-wii-blue-dark hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
