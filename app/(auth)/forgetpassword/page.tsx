"use client";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import toast from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const Schema = z
  .object({
    email: z.string().trim().email("邮箱格式不正确").max(50, "邮箱太长了"),
    digitCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "验证码必须是 6 位数字"),
    password: z
      .string()
      .trim()
      .min(6, "密码至少 6 位")
      .max(20, "密码最多 20 位"),
    confirmpassword: z
      .string()
      .trim()
      .min(6, "确认密码至少 6 位")
      .max(20, "确认密码最多 20 位"),
  })
  .refine((data) => data.password === data.confirmpassword, {
    message: "两次密码输入不一致",
    path: ["confirmpassword"],
  });

type Value = z.infer<typeof Schema>;

export default function ForgetpasswordPage() {
  //页面提示信息 (成功 ／失败)
  const [pageMessage, setPageMessage] = useState("");
  //是否正在发送验证码
  const [isSendingCode, setIsSendingCode] = useState(false);
  //倒计时(发送验证码后 60s)
  const [countdown, setCountdown] = useState(0);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(Schema),
    defaultValues: {
      email: "",
      digitCode: "",
      password: "",
      confirmpassword: "",
    },
    mode: "onSubmit",
  });

  /**
   * 👉 监听输入值（实时获取）
   */
  const emailValue = watch("email") ?? "";
  const digitCodeValue = watch("digitCode") ?? "";

  const onsubmit = async function (data: Value) {
    try {
      const result = await fetch("/api/auth/forgetpassword", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const res = await result.json();

      if (res.ok === false) {
        toast.error(res.message ?? "更新密码失败");
        return;
      }

      reset();
      toast.success(res.message ?? "更新密码成功");
      router.push("/lognin");
    } catch (error) {
      toast.error("更新密码失败，请稍后再试");
    }
  };

  const handleSendCode = async function () {
    const trimmedEamil = emailValue.trim();

    if (!trimmedEamil) {
      setError("email", {
        type: "manual",
        message: "请先输入邮箱",
      });
      return;
    }

    setIsSendingCode(true);
    setPageMessage("");
    clearErrors("email");

    try {
      const result = await fetch("/api/auth/forgetpassword/sendmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEamil,
        }),
      });

      const res = await result.json();

      if (res.ok === false) {
        setError("root.serverError", {
          type: "server",
          message: res.message ?? "发送验证码失败",
        });
        return;
      }

      // 发送成功
      clearErrors("root.serverError");
      setPageMessage(res.message ?? "验证码发送成功");
      // 启动倒计时
      setCountdown(60);
    } catch (error) {
      setError("root.serverError", {
        type: "server",
        message: "发送验证码失败，请稍后再试",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  return (
    <main className="min-h-screen bg-[url(/auth.jpg)] bg-center bg-cover bg-no-repeat relative">
      
      <div className="absolute top-4 left-4 border-2 rounded-full w-15 h-15 flex items-center justify-center hover:bg-[#FFEB3B] hover:text-black hover:font-bold ">
        <Link href="/">Home</Link>
      </div>
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur">
          <h1 className="mb-6 text-2xl font-bold">忘记密码</h1>
          <form className="space-y-4" onSubmit={handleSubmit(onsubmit)}>
            <input
              type="email"
              placeholder="请输入邮箱"
              className="w-full rounded-lg border px-4 py-3"
              {...register("email")}
            />

            <button
              type="button"
              className="w-full rounded-lg bg-black py-3 text-white"
              onClick={handleSendCode}
            >
              发送验证码
            </button>

            {/* digitCode  */}
            <div className="flex flex-col gap-3">
              <label htmlFor="digitCode" className="text-lg font-semibold">
                验证码{" "}
              </label>

              <label htmlFor="digitCode" className="relative block cursor-text">
                <div className="flex gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex h-16 w-14 items-center justify-center rounded-xl border border-black bg-gray-50 text-3xl font-bold"
                    >
                      {digitCodeValue[index] ?? ""}
                    </div>
                  ))}
                </div>
                <input
                  id="digitCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="absolute inset-0 opacity-0"
                  {...register("digitCode", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, "");
                    },
                  })}
                />
              </label>
            </div>
            {/*  */}

            <input
              type="password"
              placeholder="请输入新密码"
              className="w-full rounded-lg border px-4 py-3"
              {...register("password")}
            />
            <input
              type="password"
              placeholder="再次输入新密码"
              className="w-full rounded-lg border px-4 py-3"
              {...register("confirmpassword")}
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
              <Link href="/lognin" className="text-blue-500">
                记起了密码
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
