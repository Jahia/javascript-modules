package org.jahia.modules.javascript.modules.engine.jsengine;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.AccessMode;
import java.nio.file.DirectoryStream;
import java.nio.file.DirectoryStream.Filter;
import java.nio.file.LinkOption;
import java.nio.file.OpenOption;
import java.nio.file.Path;
import java.nio.file.attribute.FileAttribute;
import java.util.Map;
import java.util.Set;

import org.graalvm.polyglot.io.FileSystem;
import org.osgi.framework.BundleContext;
import org.apache.commons.compress.utils.SeekableInMemoryByteChannel;
import org.apache.commons.io.IOUtils;

/**
 * This class defines a virtual filesystem used to resolve
 * <code>import statements</code>.
 *
 * For now it's really basic but it opens the door for more advanced features in
 * the future.
 *
 * See each method for explanations on the import resolution process.
 */
public class JSFileSystem implements FileSystem {
  private static final String ROOT_JS_LIBS_DIR = "/META-INF/js/libs/";

  final private BundleContext bundleContext;

  JSFileSystem(BundleContext bundleContext) {
    this.bundleContext = bundleContext;
  }

  // Methods are in the same order as the execution order

  /**
   * parsePath is called on non-path imports (e.g. <code>import "react"</code> but
   * not <code>import "./react.js"</code>). It's the first step in the resolution
   * process.
   *
   * However, parsePath, for reasons foreign to me, might be called
   * with the stringified version of an already parsed path. And for internal
   * implementation-specific imports.
   *
   * For instance, it might receive
   * <code>/META-INF/js/libs/react-i18next.js</code> (stringified output of the
   * method) or <code>/usr/local/graalvm/languages/js</code> (internal import) or
   * even worse <code>d:\jdk17\languages\js</code> on Windows.
   *
   * This is safe-guarded by this <code>path.startsWith</code> check until
   * someone comes with a better solution.
   */
  @Override
  public Path parsePath(String path) {
    if (path.startsWith("/") || path.startsWith("\\") || path.contains(":\\")) {
      return Path.of(path);
    }

    return Path.of(ROOT_JS_LIBS_DIR, path + ".js");
  }

  /**
   * This method throws when access is refused, does nothing otherwise.
   */
  @Override
  public void checkAccess(Path path, Set<? extends AccessMode> modes, LinkOption... linkOptions) throws IOException {
    String resourceName = pathToResourceName(path);
    if (!resourceName.startsWith(ROOT_JS_LIBS_DIR)) {
      throw new IOException("Access refused to import " + resourceName);
    }
  }

  /**
   * This method is called for every path, like outputs of
   * {@link #parsePath(String)}} and valid relative imports after they were
   * resolved, like <code>/META-INF/js/libs/I18nextProvider-BnrOfLKR.js</code>.
   * All paths are valid at this point, so we just return them.
   */
  @Override
  public Path toRealPath(Path path, LinkOption... linkOptions) throws IOException {
    return path;
  }

  /**
   * This method is called during the resolution process but the result is
   * discarded. Not sure why, maybe just a sanity check in Graal.
   */
  @Override
  public Path toAbsolutePath(Path path) {
    return path;
  }

  /**
   * This method transforms a path into a source code file. These are fancy words
   * to say "read the file".
   */
  @Override
  public SeekableByteChannel newByteChannel(Path path, Set<? extends OpenOption> options, FileAttribute<?>... attrs)
      throws IOException {
    String resourceName = pathToResourceName(path);
    URL url = bundleContext.getBundle().getResource(resourceName);
    if (url == null) {
      throw new FileNotFoundException("Cannot import " + resourceName + ", the file does not exist");
    }

    try (InputStream inputStream = url.openStream()) {
      return new SeekableInMemoryByteChannel(IOUtils.toByteArray(inputStream));
    }
  }

  /**
   * This method is called for imports with a protocol (e.g.
   * <code>import "http://example.com"</code> or <code>import "node:http"</code>).
   * We might be able to build cool things in the future with this!
   */
  @Override
  public Path parsePath(URI uri) {
    throw new UnsupportedOperationException("Import not supported: " + uri.toString());
  }

  // Other methods are not involved in the resolution process

  @Override
  public void createDirectory(Path dir, FileAttribute<?>... attrs) throws IOException {
    throw new UnsupportedOperationException("Unimplemented method 'createDirectory'");
  }

  @Override
  public void delete(Path path) throws IOException {
    throw new UnsupportedOperationException("Unimplemented method 'delete'");
  }

  @Override
  public DirectoryStream<Path> newDirectoryStream(Path dir, Filter<? super Path> filter)
      throws IOException {
    throw new UnsupportedOperationException("Unimplemented method 'newDirectoryStream'");
  }

  @Override
  public Map<String, Object> readAttributes(Path path, String attributes, LinkOption... options)
      throws IOException {
    throw new UnsupportedOperationException("Unimplemented method 'readAttributes'");
  }

  // Helper methods

  /**
   * The {@link FileSystem} interface enforces the use of {@link Path} which is
   * platform-dependent (uses \ on Windows, / on Unix). But OSGi bundle resources
   * always use forward slashes.
   *
   * 1. Normalize (resolve . and ..)
   * 2. Convert system-specific separators into OSGi-compatible forward slashes
   */
  private String pathToResourceName(Path path) {
    return path.normalize().toString().replace('\\', '/');
  }
}
