# Making a Hero Section

In this section, we'll create a hero section for our website. A hero section is a large, full-width section at the top of a page. It usually contains a title, a subtitle, and a background image.

## Working With Editable Content

At its core, Jahia is a content management system (CMS). This means that content is king: **all development work starts with content modeling**. Jahia is built on top of [Apache Jackrabbit](https://jackrabbit.apache.org/jcr/index.html), a tree-based content repository. **This means that content is stored in a tree structure**, and each node can have properties and child nodes. Nodes are defined by node types, which are similar to tables in a relational database. **Node definitions are stored in CND files**, which stands for "Content Node Definition".

JavaScript modules are designed using the Single Directory Components (SDC) pattern. This means that each component is a folder containing all the resources needed to render it. The `src/components/` folder already contains some example components used to display a Hello World message. We'll create a new `HeroSection` component following the same pattern.

Start by creating a new folder in `src/components/` called `HeroSection`. Inside this folder, create a `definition.cnd` file with the following content:

```cnd

```

## Rendering Content

Hero section

CSS Module
