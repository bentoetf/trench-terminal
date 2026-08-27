import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18nCookieKey } from "@orderly.network/i18n/constant";
import {
  getLocalePathFromPathname,
  parseI18nLang,
  removeLangPrefix,
} from "@orderly.network/i18n/utils";
import { PathEnum } from "./constant";
import { DEFAULT_SYMBOL } from "./storage";

const localePaths = Object.values(PathEnum);

// Get the locale from cookie
function getLocaleFromCookie(request: NextRequest) {
  const lang = request.cookies.get(i18nCookieKey)?.value;
  return parseI18nLang(lang!);
}

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const { pathname } = request.nextUrl;

  const localePath = getLocalePathFromPathname(pathname);

  const pathWithoutLang = removeLangPrefix(pathname);

  if (pathWithoutLang === PathEnum.Perp) {
    request.nextUrl.pathname = `${localePath ? `/${localePath}` : ""}${PathEnum.Perp}/${DEFAULT_SYMBOL}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // If the pathname has a locale path, return
  if (localePath) return;

  let newPathname = pathname;

  const cookieLocale = getLocaleFromCookie(request);

  if (pathname === "/") {
    newPathname = `/${cookieLocale}${PathEnum.Perp}/${DEFAULT_SYMBOL}`;
  } else if (localePaths.includes(pathname as PathEnum)) {
    newPathname = `/${cookieLocale}${pathname}`;
  } else if (pathname.startsWith(PathEnum.Perp)) {
    newPathname = `/${cookieLocale}${PathEnum.Perp}/${DEFAULT_SYMBOL}`;
  }

  if (newPathname !== pathname) {
    request.nextUrl.pathname = newPathname;
    console.log(`redirect: ${pathname} ==> ${newPathname}`);
    return NextResponse.redirect(request.nextUrl);
  }
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    "/((?!_next).*)",
  ],
};
