import { getImageProps } from "../utils/image/getImageProps.js";
import type { ImgHTMLAttributes } from "react";

type GetImagePropsParams = {
  src: Parameters<typeof getImageProps>[0];
} & Omit<Parameters<typeof getImageProps>[1], "absolute">;
type JImageProps = GetImagePropsParams &
  Omit<ImgHTMLAttributes<HTMLImageElement>, keyof GetImagePropsParams>;

export function JImage({ src, ...props }: Readonly<JImageProps>) {
  return <img {...props} {...getImageProps(src, props)} />;
}
