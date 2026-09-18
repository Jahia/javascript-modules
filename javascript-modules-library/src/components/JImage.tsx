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
  srcSet: srcset,
  sizes,
  ...props
}: CommonProps & MergedOptions): JSX.Element {
  return (
    <img
      {...props}
      {
        // @ts-expect-error Incompatible props, per `getImageProps` overloads
        ...getImageProps(src, { alt, loading, width, height, srcSet: srcset, sizes })
      }
    />
  );
}
