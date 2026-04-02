"use client";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import toast from "react-hot-toast";
import type { returnType } from "@/app/api/auth/lognup/route";
import { useRouter } from "next/navigation";

const Schema = z.object({
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
});

type Value = z.infer<typeof Schema>;

export default function LognupPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const onsubmit = async function (data: Value) {
    try {
      const result = await fetch("/api/auth/lognup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const res: returnType = await result.json();

      if (res.ok === false) {
        setError("root.serverError", {
          type: "server",
          message: res.message,
        });
        return;
      }

      reset();
      toast.success(res.message);
      router.push("/lognin");
    } catch (error) {
      toast.error("注册失败，请稍后再试");
    }
  };

  return (
    <main className="relative min-h-screen bg-[url(/auth.jpg)] bg-center bg-cover bg-no-repeat">
      <div className="absolute top-4 left-4 border-2 rounded-full w-15 h-15 flex items-center justify-center hover:bg-[#FFEB3B] hover:text-black hover:font-bold ">
        <Link href="/">Home</Link>
      </div>
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur">
          <h1 className="mb-6 text-2xl font-bold">注册</h1>
          <form className="space-y-4" onSubmit={handleSubmit(onsubmit)}>
            <input
              type="email"
              placeholder="请输入邮箱"
              className="w-full rounded-lg border px-4 py-3"
              {...register("email")}
            />
            <input
              type="text"
              placeholder="请输入用户名"
              className="w-full rounded-lg border px-4 py-3"
              {...register("username")}
            />
            <input
              type="password"
              placeholder="请输入密码"
              className="w-full rounded-lg border px-4 py-3"
              {...register("password")}
            />
            <button className="w-full rounded-lg bg-black py-3 text-white">
              注册
            </button>
          </form>
          <div className="mt-4 flex justify-between">
            <div>
              <span>已有账号?</span>
              <Link href="/lognin" className="text-blue-500">
                登录
              </Link>
            </div>
            <div>
              <Link href="/forgetpassword" className="text-blue-500">
                忘记密码
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
