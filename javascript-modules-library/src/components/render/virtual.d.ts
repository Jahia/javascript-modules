/** This "module" is replaced during the build by a static list of files. */
declare module "virtual:shared-lib-files" {
  /** All client-side JS libs, used to create `<link rel="modulepreload">` tags */
  const sharedLibFiles: string[];
  export default sharedLibFiles;
}
