"use client";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(30),
});

type Value = z.infer<typeof Schema>;

export default function LogninPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const onsubmit = async function (data: Value) {
    try {
      const result = await fetch("/api/auth/lognin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const res = await result.json();

      if (res.ok === false) {
        setError("root.serverError", {
          type: "server",
          message: res.message,
        });
        return;
      }

      reset();
      toast.success(res.message);
      router.push("/chat");
    } catch (error) {
      toast.error("登录失败，请稍后再试");
    }
  };

  return (
    <main className="relative min-h-screen bg-[url(/auth.jpg)] bg-center bg-cover bg-no-repeat">
      <div className="absolute top-4 left-4 border-2 rounded-full w-15 h-15 flex items-center justify-center hover:bg-[#FFEB3B] hover:text-black hover:font-bold ">
        <Link href="/">Home</Link>
      </div>
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur">
          <h1 className="mb-6 text-2xl font-bold">登录</h1>
          <form className="space-y-4" onSubmit={handleSubmit(onsubmit)}>
            <input
              type="email"
              placeholder="请输入邮箱"
              className="w-full rounded-lg border px-4 py-3"
              {...register("email")}
            />
            <input
              type="password"
              placeholder="请输入密码"
              className="w-full rounded-lg border px-4 py-3"
              {...register("password")}
            />
            <button className="w-full rounded-lg bg-black py-3 text-white">
              登录
            </button>
          </form>
          <div className="mt-4 flex justify-between">
            <div>
              <span>还没有账号?</span>
              <Link href="/lognup" className="text-blue-500">
                注册
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
