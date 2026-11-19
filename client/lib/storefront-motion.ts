export const storefrontEase=[0.22,1,0.36,1] as const;
export const storefrontLayoutScrollEvent = 'storefront:layout-scroll';
export const storefrontMotion=(reduced:boolean):{pageDuration:number;revealDistance:number;smoothWheel:boolean}=>({pageDuration:reduced?0:0.32,revealDistance:reduced?0:20,smoothWheel:!reduced});
export const storefrontReveal={initial:{opacity:.94},animate:{opacity:1,transition:{duration:0.32,ease:storefrontEase}}};
export const storefrontHeroCaption={initial:{opacity:0,y:18},animate:{opacity:1,y:0,transition:{duration:0.8,delay:0.12,ease:storefrontEase}}};
