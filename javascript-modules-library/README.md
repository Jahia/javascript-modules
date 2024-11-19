# javascript-modules-library
Javascript Library for NPM Javascript Module Engine

## Generated types

This library contains types generated from Java source code. The types are generated using a tool called java-ts-bind
that was forked here : https://github.com/Jahia/java-ts-bind/tree/finer-excludes . You don't need to checkout this 
repository as the scripts will automatically do that for you but we mention it in case you need to make modifications
to it.

By default, the generated types are committed in this project, but if you need to rebuild/update them, you can do so by
using the following steps:

1. Change to the project directory :

    `cd types/generated`

2. Launch the script that will clone the java-ts-bind repository and build it from source code (it has never been released) :

    `./build.sh`

3. Update the classes and methods declared in [types/generated/package.json](types/generated/package.json) in case you added/removed classes or methods.

4. Launch the script that will download all the required source code and JARs for the type generation and that will
also compile the source to generated the required symbols JARs. Then it will generate the types, and finally apply
some post-processing to the generated types to make  usable :

    `./generate.sh`

Note that the generation will take some time on the initial build as it needs to download all the required source code
and JARs, and build the projects from the source code.

Once completed, the generated types will be in the following directory : 

    types/generated/build/types
