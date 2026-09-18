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
  "src" | keyof MergedOptions
>;

export function JImage(options: CommonProps & FixedSizeOptions): JSX.Element;
export function JImage(options: CommonProps & ResponsiveOptions): JSX.Element;
export function JImage({
  src,
  alt,
  loading,
  width,
  height,
  srcSet,
  sizes,
  absolute,
  ...props
}: CommonProps & MergedOptions): JSX.Element {
  return (
    // Render nothing if src is null instead of throwing an error
    // We'll see if this behavior is desirable or not with client feedback
    src && (
      <img
        {...props}
        {
          // @ts-expect-error Incompatible props, per `getImageProps` overloads
          ...getImageProps(src, {
            alt,
            loading,
            width,
            height,
            srcSet,
            sizes,
            absolute,
          })
        }
      />
    )
  );
}
