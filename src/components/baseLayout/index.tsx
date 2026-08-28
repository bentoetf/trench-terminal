"use client";

import { FC, useEffect } from "react";
import { Scaffold, ScaffoldProps } from "@orderly.network/ui-scaffold";
import { PathEnum } from "@/constant";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/hooks/useOrderlyConfig";

export type BaseLayoutProps = {
  children: React.ReactNode;
  initialMenu?: string;
  classNames?: ScaffoldProps["classNames"];
};

export const BaseLayout: FC<BaseLayoutProps> = (props) => {
  const config = useOrderlyConfig();

  const { onRouteChange } = useNav();

  // web3-onboard renders its connect modal in a shadow root with some
  // hardcoded light-gray text; inject brutalist fixes into the shadow DOM.
  useEffect(() => {
    const CSS = `
      .container label span, .container label a { color: #000 !important; font-weight: 700; }
      .container label a { color: #FF3D0A !important; text-decoration: underline; }
      input[type="checkbox"] { border: 2px solid #000 !important; border-radius: 0 !important; }
      .sidebar, .sidebar-container { border-right: 3px solid #000; }
      button.wallet-button-styling { border: 2px solid #000 !important; box-shadow: 4px 4px 0 #000; border-radius: 0 !important; }
    `;
    const inject = () => {
      const host = document.querySelector("onboard-v2") as HTMLElement | null;
      const sr = host?.shadowRoot;
      if (sr && !sr.querySelector("#tt-onboard-fix")) {
        const st = document.createElement("style");
        st.id = "tt-onboard-fix";
        st.textContent = CSS;
        sr.appendChild(st);
      }
    };
    const obs = new MutationObserver(inject);
    obs.observe(document.body, { childList: true, subtree: false });
    inject();
    return () => obs.disconnect();
  }, []);

  return (
    <Scaffold
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        initialMenu: props.initialMenu || PathEnum.Root,
      }}
      footerProps={config.scaffold.footerProps}
      routerAdapter={{
        onRouteChange,
      }}
      classNames={props.classNames}
      bottomNavProps={config.scaffold.bottomNavProps}
    >
      {props.children}
    </Scaffold>
  );
};
