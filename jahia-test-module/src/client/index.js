export default async function load(name) {
  return import(`./components/${name}.jsx`).then((module) => module.default);
}
