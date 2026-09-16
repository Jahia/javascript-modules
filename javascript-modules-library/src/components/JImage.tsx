import type { JCRNodeWrapper } from "org.jahia.services.content";
import {
  getImageProps,
  type FixedSizeOptions,
  type MergedOptions,
  type ResponsiveOptions,
} from "../utils/image/getImageProps.js";
import type { ImgHTMLAttributes, JSX } from "react";

type CommonProps = { src: JCRNodeWrapper } & Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "absolute" | keyof MergedOptions
>;

export function JImage(options: CommonProps & FixedSizeOptions): JSX.Element;
export function JImage(options: CommonProps & ResponsiveOptions): JSX.Element;
export function JImage({
  src,
  alt,
  loading,
  width,
  height,
  srcset,
  sizes,
  ...props
}: CommonProps & MergedOptions): JSX.Element {
  // @ts-expect-error Incompatible props, per `getImageProps` overloads
  return <img {...props} {...getImageProps(src, { alt, loading, width, height, srcset, sizes })} />;
}
