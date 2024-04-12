declare module 'org.osgi.framework' {
import { Dictionary, Enumeration } from 'java.util';
import { URL } from 'java.net';
import { File } from 'java.io';
/**
 * An installed bundle in the Framework.
 * 
 * 
 * A `Bundle` object is the access point to define the lifecycle of an
 * installed bundle. Each bundle installed in the OSGi environment must have an
 * associated `Bundle` object.
 * 
 * 
 * A bundle must have a unique identity, a `long`, chosen by the
 * Framework. This identity must not change during the lifecycle of a bundle,
 * even when the bundle is updated. Uninstalling and then reinstalling the
 * bundle must create a new unique identity.
 * 
 * 
 * A bundle can be in one of six states:
 * 
 * {@link #UNINSTALLED}
 * {@link #INSTALLED}
 * {@link #RESOLVED}
 * {@link #STARTING}
 * {@link #STOPPING}
 * {@link #ACTIVE}
 * 
 * 
 * Values assigned to these states have no specified ordering; they represent
 * bit values that may be ORed together to determine if a bundle is in one of
 * the valid states.
 * 
 * 
 * A bundle should only have active threads of execution when its state is one
 * of `STARTING`,`ACTIVE`, or `STOPPING`. An
 * `UNINSTALLED` bundle can not be set to another state; it is a zombie
 * and can only be reached because references are kept somewhere.
 * 
 * 
 * The Framework is the only entity that is allowed to create `Bundle`
 * objects, and these objects are only valid within the Framework that created
 * them.
 * 
 * 
 * Bundles have a natural ordering such that if two `Bundle`s have the
 * same {@link #getBundleId() bundle id} they are equal. A `Bundle` is
 * less than another `Bundle` if it has a lower {@link #getBundleId()
 * bundle id} and is greater if it has a higher bundle id.
 * 
 * @ThreadSafe
 * @author $Id: 545299bc454bb01ef73a14693ffec76a13430eea $
*/
export class Bundle {
  /**
   * Returns this bundle's current state.
   * 
   * 
   * A bundle can be in only one state at any time.
   * 
   * @return An element of `UNINSTALLED`,`INSTALLED`,
   *         `RESOLVED`, `STARTING`, `STOPPING`,
   *         `ACTIVE`.
  */
  getState(): number;
  /**
   * Returns this bundle's Manifest headers and values. This method returns
   * all the Manifest headers and values from the main section of this
   * bundle's Manifest file; that is, all lines prior to the first blank line.
   * 
   * 
   * Manifest header names are case-insensitive. The methods of the returned
   * `Dictionary` object must operate on header names in a
   * case-insensitive manner.
   * 
   * If a Manifest header value starts with "%", it must be
   * localized according to the default locale. If no localization is found
   * for a header value, the header value without the leading "%" is
   * returned.
   * 
   * 
   * For example, the following Manifest headers and values are included if
   * they are present in the Manifest file:
   * 
   * 	 *     Bundle-Name
   *     Bundle-Vendor
   *     Bundle-Version
   *     Bundle-Description
   *     Bundle-DocURL
   *     Bundle-ContactAddress
   * 
   * 
   * 
   * This method must continue to return Manifest header information while
   * this bundle is in the `UNINSTALLED` state.
   * 
   * @return An unmodifiable `Dictionary` object containing this
   *         bundle's Manifest headers and values.
   * @throws SecurityException If the caller does not have the appropriate
   *         `AdminPermission[this,METADATA]`, and the Java Runtime
   *         Environment supports permissions.
   * @see Constants#BUNDLE_LOCALIZATION
  */
  getHeaders(): Dictionary<string, string>;
  /**
   * Returns this bundle's unique identifier. This bundle is assigned a unique
   * identifier by the Framework when it was installed in the OSGi
   * environment.
   * 
   * 
   * A bundle's unique identifier has the following attributes:
   * 
   * Is unique and persistent.
   * Is a `long`.
   * Its value is not reused for another bundle, even after a bundle is
   * uninstalled.
   * Does not change while a bundle remains installed.
   * Does not change when a bundle is updated.
   * 
   * 
   * 
   * This method must continue to return this bundle's unique identifier while
   * this bundle is in the `UNINSTALLED` state.
   * 
   * @return The unique identifier of this bundle.
  */
  getBundleId(): number;
  /**
   * Returns this bundle's location identifier.
   * 
   * 
   * The location identifier is the location passed to
   * `BundleContext.installBundle` when a bundle is installed. The
   * location identifier does not change while this bundle remains installed,
   * even if this bundle is updated.
   * 
   * 
   * This method must continue to return this bundle's location identifier
   * while this bundle is in the `UNINSTALLED` state.
   * 
   * @return The string representation of this bundle's location identifier.
   * @throws SecurityException If the caller does not have the appropriate
   *         `AdminPermission[this,METADATA]`, and the Java Runtime
   *         Environment supports permissions.
  */
  getLocation(): string;
  /**
   * Returns this bundle's `ServiceReference` list for all services it
   * has registered or `null` if this bundle has no registered services.
   * 
   * 
   * If the Java runtime supports permissions, a `ServiceReference`
   * object to a service is included in the returned list only if the caller
   * has the `ServicePermission` to get the service using at least one
   * of the named classes the service was registered under.
   * 
   * 
   * The list is valid at the time of the call to this method, however, as the
   * Framework is a very dynamic environment, services can be modified or
   * unregistered at anytime.
   * 
   * @return An array of `ServiceReference` objects or `null`.
   * @throws IllegalStateException If this bundle has been uninstalled.
   * @see ServiceRegistration
   * @see ServiceReference
   * @see ServicePermission
  */
  getRegisteredServices(): ServiceReference<any>[];
  /**
   * Returns this bundle's `ServiceReference` list for all services it
   * is using or returns `null` if this bundle is not using any
   * services. A bundle is considered to be using a service if it has any
   * unreleased service objects.
   * 
   * 
   * If the Java Runtime Environment supports permissions, a
   * `ServiceReference` object to a service is included in the returned
   * list only if the caller has the `ServicePermission` to get the
   * service using at least one of the named classes the service was
   * registered under.
   * 
   * The list is valid at the time of the call to this method, however, as the
   * Framework is a very dynamic environment, services can be modified or
   * unregistered at anytime.
   * 
   * @return An array of `ServiceReference` objects or `null`.
   * @throws IllegalStateException If this bundle has been uninstalled.
   * @see ServiceReference
   * @see ServicePermission
  */
  getServicesInUse(): ServiceReference<any>[];
  /**
   * Find the specified resource from this bundle's class loader.
   * 
   * This bundle's class loader is called to search for the specified
   * resource. If this bundle's state is `INSTALLED`, this method must
   * attempt to resolve this bundle before attempting to get the specified
   * resource. If this bundle cannot be resolved, then only this bundle must
   * be searched for the specified resource. Imported packages cannot be
   * searched when this bundle has not been resolved. If this bundle is a
   * fragment bundle then `null` is returned.
   * 
   * Note: Jar and zip files are not required to include directory entries.
   * URLs to directory entries will not be returned if the bundle contents do
   * not contain directory entries.
   * 
   * @param name The name of the resource. See `ClassLoader.getResource`
   *        for a description of the format of a resource name.
   * @return A URL to the named resource, or `null` if the resource
   *         could not be found or if this bundle is a fragment bundle or if
   *         the caller does not have the appropriate
   *         `AdminPermission[this,RESOURCE]`, and the Java Runtime
   *         Environment supports permissions.
   * @throws IllegalStateException If this bundle has been uninstalled.
   * @see #getEntry(String)
   * @see #findEntries(String, String, boolean)
   * @since 1.1
  */
  getResource(name: string): URL;
  /**
   * Returns this bundle's Manifest headers and values localized to the
   * specified locale.
   * 
   * 
   * This method performs the same function as `Bundle.getHeaders()`
   * except the manifest header values are localized to the specified locale.
   * 
   * 
   * If a Manifest header value starts with "%", it must be
   * localized according to the specified locale. If a locale is specified and
   * cannot be found, then the header values must be returned using the
   * default locale. Localizations are searched for in the following order:
   * 
   * 	 *   bn + "_" + Ls + "_" + Cs + "_" + Vs
   *   bn + "_" + Ls + "_" + Cs
   *   bn + "_" + Ls
   *   bn + "_" + Ld + "_" + Cd + "_" + Vd
   *   bn + "_" + Ld + "_" + Cd
   *   bn + "_" + Ld
   *   bn
   * 
   * 
   * Where `bn` is this bundle's localization basename, `Ls`,
   * `Cs` and `Vs` are the specified locale (language, country,
   * variant) and `Ld`, `Cd` and `Vd` are the default locale
   * (language, country, variant).
   * 
   * If `null` is specified as the locale string, the header values must
   * be localized using the default locale. If the empty string ("")
   * is specified as the locale string, the header values must not be
   * localized and the raw (unlocalized) header values, including any leading
   * "%", must be returned. If no localization is found for a header
   * value, the header value without the leading "%" is returned.
   * 
   * 
   * This method must continue to return Manifest header information while
   * this bundle is in the `UNINSTALLED` state, however the header
   * values must only be available in the raw and default locale values.
   * 
   * @param locale The locale name into which the header values are to be
   *        localized. If the specified locale is `null` then the locale
   *        returned by `java.util.Locale.getDefault` is used. If the
   *        specified locale is the empty string, this method will return the
   *        raw (unlocalized) manifest headers including any leading
   *        "%".
   * @return An unmodifiable `Dictionary` object containing this
   *         bundle's Manifest headers and values.
   * @throws SecurityException If the caller does not have the appropriate
   *         `AdminPermission[this,METADATA]`, and the Java Runtime
   *         Environment supports permissions.
   * @see #getHeaders()
   * @see Constants#BUNDLE_LOCALIZATION
   * @since 1.3
  */
  getHeaders(locale: string): Dictionary<string, string>;
  /**
   * Returns the symbolic name of this bundle as specified by its
   * `Bundle-SymbolicName` manifest header. The bundle symbolic name
   * should be based on the reverse domain name naming convention like that
   * used for java packages.
   * 
   * 
   * This method must continue to return this bundle's symbolic name while
   * this bundle is in the `UNINSTALLED` state.
   * 
   * @return The symbolic name of this bundle or `null` if this bundle
   *         does not have a symbolic name.
   * @since 1.3
  */
  getSymbolicName(): string;
  /**
   * Find the specified resources from this bundle's class loader.
   * 
   * This bundle's class loader is called to search for the specified
   * resources. If this bundle's state is `INSTALLED`, this method must
   * attempt to resolve this bundle before attempting to get the specified
   * resources. If this bundle cannot be resolved, then only this bundle must
   * be searched for the specified resources. Imported packages cannot be
   * searched when a bundle has not been resolved. If this bundle is a
   * fragment bundle then `null` is returned.
   * 
   * Note: Jar and zip files are not required to include directory entries.
   * URLs to directory entries will not be returned if the bundle contents do
   * not contain directory entries.
   * 
   * @param name The name of the resource. See
   *        `ClassLoader.getResources` for a description of the format
   *        of a resource name.
   * @return An enumeration of URLs to the named resources, or `null` if
   *         the resource could not be found or if this bundle is a fragment
   *         bundle or if the caller does not have the appropriate
   *         `AdminPermission[this,RESOURCE]`, and the Java Runtime
   *         Environment supports permissions.
   * @throws IllegalStateException If this bundle has been uninstalled.
   * @throws IOException If there is an I/O error.
   * @since 1.3
  */
  getResources(name: string): Enumeration<URL>;
  /**
   * Returns an Enumeration of all the paths (`String` objects) to
   * entries within this bundle whose longest sub-path matches the specified
   * path. This bundle's class loader is not used to search for entries. Only
   * the contents of this bundle are searched.
   * 
   * The specified path is always relative to the root of this bundle and may
   * begin with a "/". A path value of "/" indicates the
   * root of this bundle.
   * 
   * Returned paths indicating subdirectory paths end with a "/".
   * The returned paths are all relative to the root of this bundle and must
   * not begin with "/".
   * 
   * Note: Jar and zip files are not required to include directory entries.
   * Paths to directory entries will not be returned if the bundle contents do
   * not contain directory entries.
   * 
   * @param path The path name for which to return entry paths.
   * @return An Enumeration of the entry paths (`String` objects) or
   *         `null` if no entry could be found or if the caller does not
   *         have the appropriate `AdminPermission[this,RESOURCE]` and
   *         the Java Runtime Environment supports permissions.
   * @throws IllegalStateException If this bundle has been uninstalled.
   * @since 1.3
  */
  getEntryPaths(path: string): Enumeration<string>;
  /**
   * Returns a URL to the entry at the specified path in this bundle. This
   * bundle's class loader is not used to search for the entry. Only the
   * contents of this bundle are searched for the entry.
   * 
   * The specified path is always relative to the root of this bundle and may
   * begin with "/". A path value of "/" indicates the
   * root of this bundle.
   * 
   * Note: Jar and zip files are not required to include directory entries.
   * URLs to directory entries will not be returned if the bundle contents do
   * not contain directory entries.
   * 
   * @param path The path name of the entry.
   * @return A URL to the entry, or `null` if no entry could be found or
   *         if the caller does not have the appropriate
   *         `AdminPermission[this,RESOURCE]` and the Java Runtime
   *         Environment supports permissions.
   * @throws IllegalStateException If this bundle has been uninstalled.
   * @since 1.3
  */
  getEntry(path: string): URL;
  /**
   * Returns the time when this bundle was last modified. A bundle is
   * considered to be modified when it is installed, updated or uninstalled.
   * 
   * 
   * The time value is the number of milliseconds since January 1, 1970,
   * 00:00:00 UTC.
   * 
   * @return The time when this bundle was last modified.
   * @since 1.3
  */
  getLastModified(): number;
  /**
   * Returns this bundle's {@link BundleContext}. The returned
   * `BundleContext` can be used by the caller to act on behalf of this
   * bundle.
   * 
   * 
   * If this bundle is not in the {@link #STARTING}, {@link #ACTIVE}, or
   * {@link #STOPPING} states or this bundle is a fragment bundle, then this
   * bundle has no valid `BundleContext`. This method will return
   * `null` if this bundle has no valid `BundleContext`.
   * 
   * @return A `BundleContext` for this bundle or `null` if this
   *         bundle has no valid `BundleContext`.
   * @throws SecurityException If the caller does not have the appropriate
   *         `AdminPermission[this,CONTEXT]`, and the Java Runtime
   *         Environment supports permissions.
   * @since 1.4
  */
  getBundleContext(): BundleContext;
  /**
   * Returns the version of this bundle as specified by its
   * `Bundle-Version` manifest header. If this bundle does not have a
   * specified version then {@link Version#emptyVersion} is returned.
   * 
   * 
   * This method must continue to return this bundle's version while this
   * bundle is in the `UNINSTALLED` state.
   * 
   * @return The version of this bundle.
   * @since 1.5
  */
  getVersion(): Version;
  /**
   * Creates a `File` object for a file in the persistent storage area
   * provided for this bundle by the Framework. This method will return
   * `null` if the platform does not have file system support or this
   * bundle is a fragment bundle.
   * 
   * 
   * A `File` object for the base directory of the persistent storage
   * area provided for this bundle by the Framework can be obtained by calling
   * this method with an empty string as `filename`.
   * 
   * 
   * If the Java Runtime Environment supports permissions, the Framework will
   * ensure that this bundle has the `java.io.FilePermission` with
   * actions `read`,`write`,`delete` for all files
   * (recursively) in the persistent storage area provided for this bundle.
   * 
   * @param filename A relative name to the file to be accessed.
   * @return A `File` object that represents the requested file or
   *         `null` if the platform does not have file system support or
   *         this bundle is a fragment bundle.
   * @throws IllegalStateException If this bundle has been uninstalled.
   * @since 1.6
  */
  getDataFile(filename: string): File;
}
/**
 * A bundle's execution context within the Framework. The context is used to
 * grant access to other methods so that this bundle can interact with the
 * Framework.
 * 
 * 
 * `BundleContext` methods allow a bundle to:
 * 
 * Subscribe to events published by the Framework.
 * Register service objects with the Framework service registry.
 * Retrieve `ServiceReferences` from the Framework service registry.
 * Get and release service objects for a referenced service.
 * Install new bundles in the Framework.
 * Get the list of bundles installed in the Framework.
 * Get the {@link Bundle} object for a bundle.
 * Create `File` objects for files in a persistent storage area
 * provided for the bundle by the Framework.
 * 
 * 
 * 
 * A `BundleContext` object will be created for a bundle when the bundle
 * is started. The `Bundle` object associated with a `BundleContext`
 * object is called the context bundle.
 * 
 * 
 * The `BundleContext` object will be passed to the
 * {@link BundleActivator#start(BundleContext)} method during activation of the
 * context bundle. The same `BundleContext` object will be passed to the
 * {@link BundleActivator#stop(BundleContext)} method when the context bundle is
 * stopped. A `BundleContext` object is generally for the private use of
 * its associated bundle and is not meant to be shared with other bundles in the
 * OSGi environment.
 * 
 * 
 * The `BundleContext` object is only valid during the execution of its
 * context bundle; that is, during the period from when the context bundle is in
 * the `STARTING`, `STOPPING`, and `ACTIVE` bundle states.
 * However, the `BundleContext` object becomes invalid after
 * {@link BundleActivator#stop(BundleContext)} returns (if the bundle has a
 * Bundle Activator). The `BundleContext` object becomes invalid before
 * disposing of any remaining registered services and releasing any remaining
 * services in use. Since those activities can result in other bundles being
 * called (for example, {@link ServiceListener}s for
 * {@link ServiceEvent#UNREGISTERING} events and {@link ServiceFactory}s for
 * unget operations), those other bundles can observe the stopping bundle in the
 * `STOPPING` state but with an invalid `BundleContext` object. If
 * the `BundleContext` object is used after it has become invalid, an
 * `IllegalStateException` must be thrown. The `BundleContext`
 * object must never be reused after its context bundle is stopped.
 * 
 * 
 * Two `BundleContext` objects are equal if they both refer to the same
 * execution context of a bundle. The Framework is the only entity that can
 * create `BundleContext` objects and they are only valid within the
 * Framework that created them.
 * 
 * 
 * A {@link Bundle} can be {@link Bundle#adapt(Class) adapted} to its
 * `BundleContext`. In order for this to succeed, the caller must have the
 * appropriate `AdminPermission[bundle,CONTEXT]` if the Java Runtime
 * Environment supports permissions.
 * 
 * @ThreadSafe
 * @author $Id: 6c43d322b8ea2137c094ce10e1f33e9c54519dd6 $
*/
export class BundleContext {
  /**
   * Returns the value of the specified property. If the key is not found in
   * the Framework properties, the system properties are then searched. The
   * method returns `null` if the property is not found.
   * 
   * 
   * All bundles must have permission to read properties whose names start
   * with "org.osgi.".
   * 
   * @param key The name of the requested property.
   * @return The value of the requested property, or `null` if the
   *         property is undefined.
   * @throws SecurityException If the caller does not have the appropriate
   *         `PropertyPermission` to read the property, and the Java
   *         Runtime Environment supports permissions.
  */
  getProperty(key: string): string;
  /**
   * Returns the `Bundle` object associated with this
   * `BundleContext`. This bundle is called the context bundle.
   * 
   * @return The `Bundle` object associated with this
   *         `BundleContext`.
   * @throws IllegalStateException If this BundleContext is no longer valid.
  */
  getBundle(): Bundle;
  /**
   * Returns the bundle with the specified identifier.
   * 
   * @param id The identifier of the bundle to retrieve.
   * @return A `Bundle` object or `null` if the identifier does
   *         not match any installed bundle.
  */
  getBundle(id: number): Bundle;
  /**
   * Returns a list of all installed bundles.
   * 
   * This method returns a list of all bundles installed in the OSGi
   * environment at the time of the call to this method. However, since the
   * Framework is a very dynamic environment, bundles can be installed or
   * uninstalled at anytime.
   * 
   * @return An array of `Bundle` objects, one object per installed
   *         bundle.
  */
  getBundles(): Bundle[];
  /**
   * Returns an array of `ServiceReference` objects. The returned array
   * of `ServiceReference` objects contains services that were
   * registered under the specified class, match the specified filter
   * expression, and the packages for the class names under which the services
   * were registered match the context bundle's packages as defined in
   * {@link ServiceReference#isAssignableTo(Bundle, String)}.
   * 
   * 
   * The list is valid at the time of the call to this method. However since
   * the Framework is a very dynamic environment, services can be modified or
   * unregistered at any time.
   * 
   * 
   * The specified `filter` expression is used to select the registered
   * services whose service properties contain keys and values which satisfy
   * the filter expression. See {@link Filter} for a description of the filter
   * syntax. If the specified `filter` is `null`, all registered
   * services are considered to match the filter. If the specified
   * `filter` expression cannot be parsed, an
   * {@link InvalidSyntaxException} will be thrown with a human readable
   * message where the filter became unparsable.
   * 
   * 
   * The result is an array of `ServiceReference` objects for all
   * services that meet all of the following conditions:
   * 
   * If the specified class name, `clazz`, is not `null`, the
   * service must have been registered with the specified class name. The
   * complete list of class names with which a service was registered is
   * available from the service's {@link Constants#OBJECTCLASS objectClass}
   * property.
   * If the specified `filter` is not `null`, the filter
   * expression must match the service.
   * If the Java Runtime Environment supports permissions, the caller must
   * have `ServicePermission` with the `GET` action for at least
   * one of the class names under which the service was registered.
   * For each class name with which the service was registered, calling
   * {@link ServiceReference#isAssignableTo(Bundle, String)} with the context
   * bundle and the class name on the service's `ServiceReference`
   * object must return `true`
   * 
   * 
   * @param clazz The class name with which the service was registered or
   *        `null` for all services.
   * @param filter The filter expression or `null` for all services.
   * @return An array of `ServiceReference` objects or `null` if
   *         no services are registered which satisfy the search.
   * @throws InvalidSyntaxException If the specified `filter` contains
   *         an invalid filter expression that cannot be parsed.
   * @throws IllegalStateException If this BundleContext is no longer valid.
  */
  getServiceReferences(clazz: string, filter: string): ServiceReference<any>[];
  /**
   * Returns an array of `ServiceReference` objects. The returned array
   * of `ServiceReference` objects contains services that were
   * registered under the specified class and match the specified filter
   * expression.
   * 
   * 
   * The list is valid at the time of the call to this method. However since
   * the Framework is a very dynamic environment, services can be modified or
   * unregistered at any time.
   * 
   * 
   * The specified `filter` expression is used to select the registered
   * services whose service properties contain keys and values which satisfy
   * the filter expression. See {@link Filter} for a description of the filter
   * syntax. If the specified `filter` is `null`, all registered
   * services are considered to match the filter. If the specified
   * `filter` expression cannot be parsed, an
   * {@link InvalidSyntaxException} will be thrown with a human readable
   * message where the filter became unparsable.
   * 
   * 
   * The result is an array of `ServiceReference` objects for all
   * services that meet all of the following conditions:
   * 
   * If the specified class name, `clazz`, is not `null`, the
   * service must have been registered with the specified class name. The
   * complete list of class names with which a service was registered is
   * available from the service's {@link Constants#OBJECTCLASS objectClass}
   * property.
   * If the specified `filter` is not `null`, the filter
   * expression must match the service.
   * If the Java Runtime Environment supports permissions, the caller must
   * have `ServicePermission` with the `GET` action for at least
   * one of the class names under which the service was registered.
   * 
   * 
   * @param clazz The class name with which the service was registered or
   *        `null` for all services.
   * @param filter The filter expression or `null` for all services.
   * @return An array of `ServiceReference` objects or `null` if
   *         no services are registered which satisfy the search.
   * @throws InvalidSyntaxException If the specified `filter` contains
   *         an invalid filter expression that cannot be parsed.
   * @throws IllegalStateException If this BundleContext is no longer valid.
   * @since 1.3
  */
  getAllServiceReferences(clazz: string, filter: string): ServiceReference<any>[];
  /**
   * Returns a `ServiceReference` object for a service that implements
   * and was registered under the specified class.
   * 
   * 
   * The returned `ServiceReference` object is valid at the time of the
   * call to this method. However as the Framework is a very dynamic
   * environment, services can be modified or unregistered at any time.
   * 
   * 
   * This method is the same as calling
   * {@link #getServiceReferences(String, String)} with a `null` filter
   * expression and then finding the reference with the highest priority. It
   * is provided as a convenience for when the caller is interested in any
   * service that implements the specified class.
   * 
   * If multiple such services exist, the service with the highest priority is
   * selected. This priority is defined as the service reference with the
   * highest ranking (as specified in its {@link Constants#SERVICE_RANKING}
   * property) is returned.
   * 
   * If there is a tie in ranking, the service with the lowest service id (as
   * specified in its {@link Constants#SERVICE_ID} property); that is, the
   * service that was registered first is returned.
   * 
   * @param clazz The class name with which the service was registered.
   * @return A `ServiceReference` object, or `null` if no services
   *         are registered which implement the named class.
   * @throws IllegalStateException If this BundleContext is no longer valid.
   * @see #getServiceReferences(String, String)
  */
  getServiceReference(clazz: string): ServiceReference<any>;
  /**
   * Returns the service object for the service referenced by the specified
   * `ServiceReference` object.
   * 
   * 
   * A bundle's use of a service object obtained from this method is tracked
   * by the bundle's use count of that service. Each time the service object
   * is returned by {@link #getService(ServiceReference)} the context bundle's
   * use count for the service is incremented by one. Each time the service
   * object is released by {@link #ungetService(ServiceReference)} the context
   * bundle's use count for the service is decremented by one.
   * 
   * 
   * When a bundle's use count for the service drops to zero, the bundle
   * should no longer use the service object.
   * 
   * 
   * This method will always return `null` when the service associated
   * with the specified `reference` has been unregistered.
   * 
   * 
   * The following steps are required to get the service object:
   * 
   * If the service has been unregistered, `null` is returned.
   * If the context bundle's use count for the service is currently zero
   * and the service has {@link Constants#SCOPE_BUNDLE bundle} or
   * {@link Constants#SCOPE_PROTOTYPE prototype} scope, the
   * {@link ServiceFactory#getService(Bundle, ServiceRegistration)} method is
   * called to supply the service object for the context bundle. If the
   * service object returned by the `ServiceFactory` object is
   * `null`, not an `instanceof` all the classes named when the
   * service was registered or the `ServiceFactory` object throws an
   * exception or will be recursively called for the context bundle,
   * `null` is returned and a Framework event of type
   * {@link FrameworkEvent#ERROR} containing a {@link ServiceException}
   * describing the error is fired. The supplied service object is cached by
   * the Framework. While the context bundle's use count for the service is
   * greater than zero, subsequent calls to get the service object for the
   * context bundle will return the cached service object.
   * The context bundle's use count for the service is incremented by one.
   * 
   * The service object for the service is returned.
   * 
   * 
   * @param  Type of Service.
   * @param reference A reference to the service.
   * @return A service object for the service associated with
   *         `reference` or `null` if the service is not
   *         registered, the service object returned by a
   *         `ServiceFactory` does not implement the classes under which
   *         it was registered or the `ServiceFactory` threw an
   *         exception.
   * @throws SecurityException If the caller does not have the
   *         `ServicePermission` to get the service using at least one
   *         of the named classes the service was registered under and the
   *         Java Runtime Environment supports permissions.
   * @throws IllegalStateException If this BundleContext is no longer valid.
   * @throws IllegalArgumentException If the specified
   *         `ServiceReference` was not created by the same framework
   *         instance as this `BundleContext`.
   * @see #ungetService(ServiceReference)
   * @see ServiceFactory
  */
  getService<S>(reference: ServiceReference<S>): S;
  /**
   * Returns the {@link ServiceObjects} object for the service referenced by
   * the specified `ServiceReference` object.
   * 
   * 
   * The {@link ServiceObjects} object can be used to obtain multiple service
   * objects for services with {@link Constants#SCOPE_PROTOTYPE prototype}
   * scope.
   * 
   * 
   * For services with {@link Constants#SCOPE_SINGLETON singleton} or
   * {@link Constants#SCOPE_BUNDLE bundle} scope, the
   * {@link ServiceObjects#getService()} method behaves the same as the
   * {@link #getService(ServiceReference)} method and the
   * {@link ServiceObjects#ungetService(Object)} method behaves the same as
   * the {@link #ungetService(ServiceReference)} method. That is, only one,
   * use-counted service object is available from the {@link ServiceObjects}
   * object.
   * 
   * 
   * This method will always return `null` when the service associated
   * with the specified `reference` has been unregistered.
   * 
   * @param  Type of Service.
   * @param reference A reference to the service.
   * @return A {@link ServiceObjects} object for the service associated with
   *         the specified `reference` or `null` if the service is
   *         not registered.
   * @throws SecurityException If the caller does not have the
   *         `ServicePermission` to get the service using at least one
   *         of the named classes the service was registered under and the
   *         Java Runtime Environment supports permissions.
   * @throws IllegalStateException If this BundleContext is no longer valid.
   * @throws IllegalArgumentException If the specified
   *         `ServiceReference` was not created by the same framework
   *         instance as this `BundleContext`.
   * @see PrototypeServiceFactory
   * @since 1.8
  */
  getServiceObjects<S>(reference: ServiceReference<S>): ServiceObjects<S>;
  /**
   * Creates a `File` object for a file in the persistent storage area
   * provided for the bundle by the Framework. This method will return
   * `null` if the platform does not have file system support.
   * 
   * 
   * A `File` object for the base directory of the persistent storage
   * area provided for the context bundle by the Framework can be obtained by
   * calling this method with an empty string as `filename`.
   * 
   * 
   * If the Java Runtime Environment supports permissions, the Framework will
   * ensure that the bundle has the `java.io.FilePermission` with
   * actions `read`,`write`,`delete` for all files
   * (recursively) in the persistent storage area provided for the context
   * bundle.
   * 
   * @param filename A relative name to the file to be accessed.
   * @return A `File` object that represents the requested file or
   *         `null` if the platform does not have file system support.
   * @throws IllegalStateException If this BundleContext is no longer valid.
  */
  getDataFile(filename: string): File;
  /**
   * Returns the bundle with the specified location.
   * 
   * @param location The location of the bundle to retrieve.
   * @return A `Bundle` object or `null` if the location does not
   *         match any installed bundle.
   * @since 1.6
  */
  getBundle(location: string): Bundle;
}
/**
 * Allows multiple service objects for a service to be obtained.
 * 
 * For services with {@link Constants#SCOPE_PROTOTYPE prototype} scope, multiple
 * service objects for the service can be obtained. Since implementations of
 * {@link PrototypeServiceFactory} can return the same service object
 * repeatedly, the framework must use count the returned service objects to
 * release the service object only when its use count returns to zero.
 * 
 * For services with {@link Constants#SCOPE_SINGLETON singleton} or
 * {@link Constants#SCOPE_BUNDLE bundle} scope, only one, use-counted service
 * object is available to a requesting bundle.
 * 
 * Any unreleased service objects obtained from this `ServiceObjects`
 * object are automatically released by the framework when the bundle associated
 * with the BundleContext used to create this `ServiceObjects` object is
 * stopped.
 * 
 * @param  Type of Service
 * @see BundleContext#getServiceObjects(ServiceReference)
 * @see PrototypeServiceFactory
 * @ThreadSafe
 * @since 1.8
 * @author $Id$
*/
export class ServiceObjects<S> {

}
/**
 * A reference to a service.
 * 
 * 
 * The Framework returns `ServiceReference` objects from the
 * `BundleContext.getServiceReference` and
 * `BundleContext.getServiceReferences` methods.
 * 
 * A `ServiceReference` object may be shared between bundles and can be
 * used to examine the properties of the service and to get the service object.
 * 
 * Every service registered in the Framework has a unique
 * `ServiceRegistration` object and may have multiple, distinct
 * `ServiceReference` objects referring to it. `ServiceReference`
 * objects associated with a `ServiceRegistration` object have the same
 * `hashCode` and are considered equal (more specifically, their
 * `equals()` method will return `true` when compared).
 * 
 * If the same service object is registered multiple times,
 * `ServiceReference` objects associated with different
 * `ServiceRegistration` objects are not equal.
 * 
 * @param  Type of Service.
 * @see BundleContext#getServiceReference(Class)
 * @see BundleContext#getServiceReference(String)
 * @see BundleContext#getServiceReferences(Class, String)
 * @see BundleContext#getServiceReferences(String, String)
 * @see BundleContext#getService(ServiceReference)
 * @see BundleContext#getServiceObjects(ServiceReference)
 * @ThreadSafe
 * @author $Id: 1454244c30992b7a52ac3838b03bc584c3495816 $
*/
export class ServiceReference<S> {
  /**
   * Returns the property value to which the specified property key is mapped
   * in the properties `Dictionary` object of the service referenced by
   * this `ServiceReference` object.
   * 
   * 
   * Property keys are case-insensitive.
   * 
   * 
   * This method must continue to return property values after the service has
   * been unregistered. This is so references to unregistered services (for
   * example, `ServiceReference` objects stored in the log) can still be
   * interrogated.
   * 
   * @param key The property key.
   * @return The property value to which the key is mapped; `null` if
   *         there is no property named after the key.
  */
  getProperty(key: string): any;
  /**
   * Returns an array of the keys in the properties `Dictionary` object
   * of the service referenced by this `ServiceReference` object.
   * 
   * 
   * This method will continue to return the keys after the service has been
   * unregistered. This is so references to unregistered services (for
   * example, `ServiceReference` objects stored in the log) can still be
   * interrogated.
   * 
   * 
   * This method is case-preserving ; this means that every key in the
   * returned array must have the same case as the corresponding key in the
   * properties `Dictionary` that was passed to the
   * {@link BundleContext#registerService(String[],Object,Dictionary)} or
   * {@link ServiceRegistration#setProperties(Dictionary)} methods.
   * 
   * @return An array of property keys.
  */
  getPropertyKeys(): string[];
  /**
   * Returns the bundle that registered the service referenced by this
   * `ServiceReference` object.
   * 
   * 
   * This method must return `null` when the service has been
   * unregistered. This can be used to determine if the service has been
   * unregistered.
   * 
   * @return The bundle that registered the service referenced by this
   *         `ServiceReference` object; `null` if that service has
   *         already been unregistered.
   * @see BundleContext#registerService(String[],Object,Dictionary)
  */
  getBundle(): Bundle;
  /**
   * Returns the bundles that are using the service referenced by this
   * `ServiceReference` object. Specifically, this method returns the
   * bundles whose usage count for that service is greater than zero.
   * 
   * @return An array of bundles whose usage count for the service referenced
   *         by this `ServiceReference` object is greater than zero;
   *         `null` if no bundles are currently using that service.
   * 
   * @since 1.1
  */
  getUsingBundles(): Bundle[];
  /**
   * Returns a copy of the properties of the service referenced by this
   * `ServiceReference` object.
   * 
   * This method will continue to return the properties after the service has
   * been unregistered. This is so references to unregistered services (for
   * example, `ServiceReference` objects stored in the log) can still be
   * interrogated.
   * 
   * The returned `Dictionary` object:
   * 
   * Must map property values by using property keys in a
   * case-insensitive manner.
   * Must return property keys is a case-preserving manner. This
   * means that the keys must have the same case as the corresponding key in
   * the properties `Dictionary` that was passed to the
   * {@link BundleContext#registerService(String[],Object,Dictionary)} or
   * {@link ServiceRegistration#setProperties(Dictionary)} methods.
   * Is the property of the caller and can be modified by the caller but
   * any changes are not reflected in the properties of the service.
   * {@link ServiceRegistration#setProperties(Dictionary)} must be called to
   * modify the properties of the service.
   * 
   * 
   * @return A copy of the properties of the service referenced by this
   *         `ServiceReference` object
   * @since 1.9
  */
  getProperties(): Dictionary<string, any>;
}
export class Version {
  /**
   * Returns the major component of this version identifier.
   * 
   * @return The major component.
  */
  getMajor(): number;
  /**
   * Returns the minor component of this version identifier.
   * 
   * @return The minor component.
  */
  getMinor(): number;
  /**
   * Returns the micro component of this version identifier.
   * 
   * @return The micro component.
  */
  getMicro(): number;
  /**
   * Returns the qualifier component of this version identifier.
   * 
   * @return The qualifier component.
  */
  getQualifier(): string;
}

}
