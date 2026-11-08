export const storefrontEase=[0.22,1,0.36,1] as const;
export const storefrontMotion=(reduced:boolean):{pageDuration:number;revealDistance:number;smoothWheel:boolean}=>({pageDuration:reduced?0:0.55,revealDistance:reduced?0:20,smoothWheel:!reduced});
export const storefrontReveal={initial:{opacity:0,y:20},animate:{opacity:1,y:0,transition:{duration:0.65,ease:storefrontEase}}};
export const storefrontHeroImage={initial:{scale:1.04},animate:{scale:1,transition:{duration:1.3,ease:storefrontEase}}};
export const storefrontHeroCaption={initial:{opacity:0,y:18},animate:{opacity:1,y:0,transition:{duration:0.8,delay:0.12,ease:storefrontEase}}};
export const storefrontFilterPanel={initial:{x:'-100%'},animate:{x:0,transition:{duration:0.55,ease:storefrontEase}},exit:{x:'-100%',transition:{duration:0.4,ease:storefrontEase}}};
export const storefrontBackdrop={initial:{opacity:0},animate:{opacity:1,transition:{duration:0.35}},exit:{opacity:0,transition:{duration:0.3}}};
