declare module 'java.util' {
export class Collection<E> {
  /**
   * Returns the number of elements in this collection.  If this collection
   * contains more than `Integer.MAX_VALUE` elements, returns
   * `Integer.MAX_VALUE`.
   *
   * @return the number of elements in this collection
  */
  size(): number;
  /**
   * Returns `true` if this collection contains no elements.
   *
   * @return `true` if this collection contains no elements
  */
  isEmpty(): boolean;
  /**
   * Returns `true` if this collection contains the specified element.
   * More formally, returns `true` if and only if this collection
   * contains at least one element `e` such that
   * `Objects.equals(o, e)`.
   *
   * @param o element whose presence in this collection is to be tested
   * @return `true` if this collection contains the specified
   *         element
   * @throws ClassCastException if the type of the specified element
   *         is incompatible with this collection
   *         (optional)
   * @throws NullPointerException if the specified element is null and this
   *         collection does not permit null elements
   *         (optional)
  */
  contains(o: any): boolean;
  /**
   * Returns an iterator over the elements in this collection.  There are no
   * guarantees concerning the order in which the elements are returned
   * (unless this collection is an instance of some class that provides a
   * guarantee).
   *
   * @return an `Iterator` over the elements in this collection
  */
  iterator(): Iterator<E>;
}
/**
 * The class `Date` represents a specific instant
 * in time, with millisecond precision.
 * 
 * Prior to JDK 1.1, the class `Date` had two additional
 * functions.  It allowed the interpretation of dates as year, month, day, hour,
 * minute, and second values.  It also allowed the formatting and parsing
 * of date strings.  Unfortunately, the API for these functions was not
 * amenable to internationalization.  As of JDK 1.1, the
 * `Calendar` class should be used to convert between dates and time
 * fields and the `DateFormat` class should be used to format and
 * parse date strings.
 * The corresponding methods in `Date` are deprecated.
 * 
 * Although the `Date` class is intended to reflect
 * coordinated universal time (UTC), it may not do so exactly,
 * depending on the host environment of the Java Virtual Machine.
 * Nearly all modern operating systems assume that 1 day =
 * 24 × 60 × 60 = 86400 seconds
 * in all cases. In UTC, however, about once every year or two there
 * is an extra second, called a "leap second." The leap
 * second is always added as the last second of the day, and always
 * on December 31 or June 30. For example, the last minute of the
 * year 1995 was 61 seconds long, thanks to an added leap second.
 * Most computer clocks are not accurate enough to be able to reflect
 * the leap-second distinction.
 * 
 * Some computer standards are defined in terms of Greenwich mean
 * time (GMT), which is equivalent to universal time (UT).  GMT is
 * the "civil" name for the standard; UT is the
 * "scientific" name for the same standard. The
 * distinction between UTC and UT is that UTC is based on an atomic
 * clock and UT is based on astronomical observations, which for all
 * practical purposes is an invisibly fine hair to split. Because the
 * earth's rotation is not uniform (it slows down and speeds up
 * in complicated ways), UT does not always flow uniformly. Leap
 * seconds are introduced as needed into UTC so as to keep UTC within
 * 0.9 seconds of UT1, which is a version of UT with certain
 * corrections applied. There are other time and date systems as
 * well; for example, the time scale used by the satellite-based
 * global positioning system (GPS) is synchronized to UTC but is
 * not adjusted for leap seconds. An interesting source of
 * further information is the United States Naval Observatory (USNO):
 *  *     http://www.usno.navy.mil/USNO
 * 
 * 
 * and the material regarding "Systems of Time" at:
 *  *     http://www.usno.navy.mil/USNO/time/master-clock/systems-of-time
 * 
 * 
 * which has descriptions of various different time systems including
 * UT, UT1, and UTC.
 * 
 * In all methods of class `Date` that accept or return
 * year, month, date, hours, minutes, and seconds values, the
 * following representations are used:
 * 
 * A year y is represented by the integer
 *     y `- 1900`.
 * A month is represented by an integer from 0 to 11; 0 is January,
 *     1 is February, and so forth; thus 11 is December.
 * A date (day of month) is represented by an integer from 1 to 31
 *     in the usual manner.
 * An hour is represented by an integer from 0 to 23. Thus, the hour
 *     from midnight to 1 a.m. is hour 0, and the hour from noon to 1
 *     p.m. is hour 12.
 * A minute is represented by an integer from 0 to 59 in the usual manner.
 * A second is represented by an integer from 0 to 61; the values 60 and
 *     61 occur only for leap seconds and even then only in Java
 *     implementations that actually track leap seconds correctly. Because
 *     of the manner in which leap seconds are currently introduced, it is
 *     extremely unlikely that two leap seconds will occur in the same
 *     minute, but this specification follows the date and time conventions
 *     for ISO C.
 * 
 * 
 * In all cases, arguments given to methods for these purposes need
 * not fall within the indicated ranges; for example, a date may be
 * specified as January 32 and is interpreted as meaning February 1.
 *
 * @author  James Gosling
 * @author  Arthur van Hoff
 * @author  Alan Liu
 * @see     java.text.DateFormat
 * @see     java.util.Calendar
 * @see     java.util.TimeZone
 * @since   1.0
*/
export class Date {
  /**
   * Returns the number of milliseconds since January 1, 1970, 00:00:00 GMT
   * represented by this `Date` object.
   *
   * @return  the number of milliseconds since January 1, 1970, 00:00:00 GMT
   *          represented by this date.
  */
  getTime(): number;
  /**
   * Converts this `Date` object to a `String`
   * of the form:
   *      * dow mon dd hh:mm:ss zzz yyyy
   * where:
   * `dow` is the day of the week ({@code Sun, Mon, Tue, Wed,
   *     Thu, Fri, Sat}).
   * `mon` is the month ({@code Jan, Feb, Mar, Apr, May, Jun,
   *     Jul, Aug, Sep, Oct, Nov, Dec}).
   * `dd` is the day of the month (`01` through
   *     `31`), as two decimal digits.
   * `hh` is the hour of the day (`00` through
   *     `23`), as two decimal digits.
   * `mm` is the minute within the hour (`00` through
   *     `59`), as two decimal digits.
   * `ss` is the second within the minute (`00` through
   *     `61`, as two decimal digits.
   * `zzz` is the time zone (and may reflect daylight saving
   *     time). Standard time zone abbreviations include those
   *     recognized by the method `parse`. If time zone
   *     information is not available, then `zzz` is empty -
   *     that is, it consists of no characters at all.
   * `yyyy` is the year, as four decimal digits.
   * 
   *
   * @return  a string representation of this date.
   * @see     java.util.Date#toLocaleString()
   * @see     java.util.Date#toGMTString()
  */
  toString(): string;
}
/**
 * The `Dictionary` class is the abstract parent of any
 * class, such as `Hashtable`, which maps keys to values.
 * Every key and every value is an object. In any one `Dictionary`
 * object, every key is associated with at most one value. Given a
 * `Dictionary` and a key, the associated element can be looked up.
 * Any non-`null` object can be used as a key and as a value.
 * 
 * As a rule, the `equals` method should be used by
 * implementations of this class to decide if two keys are the same.
 * 
 * NOTE: This class is obsolete.  New implementations should
 * implement the Map interface, rather than extending this class.
 *
 * @author  unascribed
 * @see     java.util.Map
 * @see     java.lang.Object#equals(java.lang.Object)
 * @see     java.lang.Object#hashCode()
 * @see     java.util.Hashtable
 * @since   1.0
*/
export class Dictionary<K, V> {
  /**
   * Returns the number of entries (distinct keys) in this dictionary.
   *
   * @return  the number of keys in this dictionary.
  */
  size(): number;
  /**
   * Tests if this dictionary maps no keys to value. The general contract
   * for the `isEmpty` method is that the result is true if and only
   * if this dictionary contains no entries.
   *
   * @return  `true` if this dictionary maps no keys to values;
   *          `false` otherwise.
  */
  isEmpty(): boolean;
  /**
   * Returns the value to which the key is mapped in this dictionary.
   * The general contract for the `isEmpty` method is that if this
   * dictionary contains an entry for the specified key, the associated
   * value is returned; otherwise, `null` is returned.
   *
   * @return  the value to which the key is mapped in this dictionary;
   * @param   key   a key in this dictionary.
   *          `null` if the key is not mapped to any value in
   *          this dictionary.
   * @exception NullPointerException if the `key` is `null`.
   * @see     java.util.Dictionary#put(java.lang.Object, java.lang.Object)
  */
  get(key: any): V;
}
/**
 * An object that implements the Enumeration interface generates a
 * series of elements, one at a time. Successive calls to the
 * `nextElement` method return successive elements of the
 * series.
 * 
 * For example, to print all elements of a `Vector` v:
 *  *   for (Enumeration<E> e = v.elements(); e.hasMoreElements();)
 *       System.out.println(e.nextElement());
 * 
 * Methods are provided to enumerate through the elements of a
 * vector, the keys of a hashtable, and the values in a hashtable.
 * Enumerations are also used to specify the input streams to a
 * `SequenceInputStream`.
 *
 * @apiNote
 * The functionality of this interface is duplicated by the {@link Iterator}
 * interface.  In addition, `Iterator` adds an optional remove operation,
 * and has shorter method names.  New implementations should consider using
 * `Iterator` in preference to `Enumeration`. It is possible to
 * adapt an `Enumeration` to an `Iterator` by using the
 * {@link #asIterator} method.
 *
 * @see     java.util.Iterator
 * @see     java.io.SequenceInputStream
 * @see     java.util.Enumeration#nextElement()
 * @see     java.util.Hashtable
 * @see     java.util.Hashtable#elements()
 * @see     java.util.Hashtable#keys()
 * @see     java.util.Vector
 * @see     java.util.Vector#elements()
 *
 * @author  Lee Boynton
 * @since   1.0
*/
export class Enumeration<E> {
  /**
   * Tests if this enumeration contains more elements.
   *
   * @return  `true` if and only if this enumeration object
   *           contains at least one more element to provide;
   *          `false` otherwise.
  */
  hasMoreElements(): boolean;
  /**
   * Returns the next element of this enumeration if this enumeration
   * object has at least one more element to provide.
   *
   * @return     the next element of this enumeration.
   * @exception  NoSuchElementException  if no more elements exist.
  */
  nextElement(): E;
}
/**
 * An iterator over a collection.  `Iterator` takes the place of
 * {@link Enumeration} in the Java Collections Framework.  Iterators
 * differ from enumerations in two ways:
 *
 * 
 *       Iterators allow the caller to remove elements from the
 *           underlying collection during the iteration with well-defined
 *           semantics.
 *       Method names have been improved.
 * 
 *
 * This interface is a member of the
 * 
 * Java Collections Framework.
 *
 * @apiNote
 * An {@link Enumeration} can be converted into an `Iterator` by
 * using the {@link Enumeration#asIterator} method.
 *
 * @param  the type of elements returned by this iterator
 *
 * @author  Josh Bloch
 * @see Collection
 * @see ListIterator
 * @see Iterable
 * @since 1.2
*/
export class Iterator<E> {
  /**
   * Returns `true` if the iteration has more elements.
   * (In other words, returns `true` if {@link #next} would
   * return an element rather than throwing an exception.)
   *
   * @return `true` if the iteration has more elements
  */
  hasNext(): boolean;
  /**
   * Returns the next element in the iteration.
   *
   * @return the next element in the iteration
   * @throws NoSuchElementException if the iteration has no more elements
  */
  next(): E;
}
export class List<E> {
  /**
   * Returns the number of elements in this list.  If this list contains
   * more than `Integer.MAX_VALUE` elements, returns
   * `Integer.MAX_VALUE`.
   *
   * @return the number of elements in this list
  */
  size(): number;
  /**
   * Returns `true` if this list contains no elements.
   *
   * @return `true` if this list contains no elements
  */
  isEmpty(): boolean;
  /**
   * Returns an iterator over the elements in this list in proper sequence.
   *
   * @return an iterator over the elements in this list in proper sequence
  */
  iterator(): Iterator<E>;
  /**
   * Returns the element at the specified position in this list.
   *
   * @param index index of the element to return
   * @return the element at the specified position in this list
   * @throws IndexOutOfBoundsException if the index is out of range
   *         (`index < 0 || index >= size()`)
  */
  get(index: number): E;
}
/**
 * A Locale object represents a specific geographical, political,
 * or cultural region. An operation that requires a Locale to perform
 * its task is called locale-sensitive and uses the Locale
 * to tailor information for the user. For example, displaying a number
 * is a locale-sensitive operation— the number should be formatted
 * according to the customs and conventions of the user's native country,
 * region, or culture.
 *
 *  The `Locale` class implements IETF BCP 47 which is composed of
 * RFC 4647 "Matching of Language
 * Tags" and RFC 5646 "Tags
 * for Identifying Languages" with support for the LDML (UTS#35, "Unicode
 * Locale Data Markup Language") BCP 47-compatible extensions for locale data
 * exchange.
 *
 *  A Locale object logically consists of the fields
 * described below.
 *
 * 
 *   language
 *
 *   ISO 639 alpha-2 or alpha-3 language code, or registered
 *   language subtags up to 8 alpha letters (for future enhancements).
 *   When a language has both an alpha-2 code and an alpha-3 code, the
 *   alpha-2 code must be used.  You can find a full list of valid
 *   language codes in the IANA Language Subtag Registry (search for
 *   "Type: language").  The language field is case insensitive, but
 *   Locale always canonicalizes to lower case.
 *
 *   Well-formed language values have the form
 *   [a-zA-Z]{2,8}.  Note that this is not the full
 *   BCP47 language production, since it excludes extlang.  They are
 *   not needed since modern three-letter language codes replace
 *   them.
 *
 *   Example: "en" (English), "ja" (Japanese), "kok" (Konkani)
 *
 *   script
 *
 *   ISO 15924 alpha-4 script code.  You can find a full list of
 *   valid script codes in the IANA Language Subtag Registry (search
 *   for "Type: script").  The script field is case insensitive, but
 *   Locale always canonicalizes to title case (the first
 *   letter is upper case and the rest of the letters are lower
 *   case).
 *
 *   Well-formed script values have the form
 *   [a-zA-Z]{4}
 *
 *   Example: "Latn" (Latin), "Cyrl" (Cyrillic)
 *
 *   country (region)
 *
 *   ISO 3166 alpha-2 country code or UN M.49 numeric-3 area code.
 *   You can find a full list of valid country and region codes in the
 *   IANA Language Subtag Registry (search for "Type: region").  The
 *   country (region) field is case insensitive, but
 *   Locale always canonicalizes to upper case.
 *
 *   Well-formed country/region values have
 *   the form [a-zA-Z]{2} | [0-9]{3}
 *
 *   Example: "US" (United States), "FR" (France), "029"
 *   (Caribbean)
 *
 *   variant
 *
 *   Any arbitrary value used to indicate a variation of a
 *   Locale.  Where there are two or more variant values
 *   each indicating its own semantics, these values should be ordered
 *   by importance, with most important first, separated by
 *   underscore('_').  The variant field is case sensitive.
 *
 *   Note: IETF BCP 47 places syntactic restrictions on variant
 *   subtags.  Also BCP 47 subtags are strictly used to indicate
 *   additional variations that define a language or its dialects that
 *   are not covered by any combinations of language, script and
 *   region subtags.  You can find a full list of valid variant codes
 *   in the IANA Language Subtag Registry (search for "Type: variant").
 *
 *   However, the variant field in Locale has
 *   historically been used for any kind of variation, not just
 *   language variations.  For example, some supported variants
 *   available in Java SE Runtime Environments indicate alternative
 *   cultural behaviors such as calendar type or number script.  In
 *   BCP 47 this kind of information, which does not identify the
 *   language, is supported by extension subtags or private use
 *   subtags.
 *
 *   Well-formed variant values have the form SUBTAG
 *   (('_'|'-') SUBTAG)* where SUBTAG =
 *   [0-9][0-9a-zA-Z]{3} | [0-9a-zA-Z]{5,8}. (Note: BCP 47 only
 *   uses hyphen ('-') as a delimiter, this is more lenient).
 *
 *   Example: "polyton" (Polytonic Greek), "POSIX"
 *
 *   extensions
 *
 *   A map from single character keys to string values, indicating
 *   extensions apart from language identification.  The extensions in
 *   Locale implement the semantics and syntax of BCP 47
 *   extension subtags and private use subtags. The extensions are
 *   case insensitive, but Locale canonicalizes all
 *   extension keys and values to lower case. Note that extensions
 *   cannot have empty values.
 *
 *   Well-formed keys are single characters from the set
 *   [0-9a-zA-Z].  Well-formed values have the form
 *   SUBTAG ('-' SUBTAG)* where for the key 'x'
 *   SUBTAG = [0-9a-zA-Z]{1,8} and for other keys
 *   SUBTAG = [0-9a-zA-Z]{2,8} (that is, 'x' allows
 *   single-character subtags).
 *
 *   Example: key="u"/value="ca-japanese" (Japanese Calendar),
 *   key="x"/value="java-1-7"
 * 
 *
 * Note: Although BCP 47 requires field values to be registered
 * in the IANA Language Subtag Registry, the Locale class
 * does not provide any validation features.  The Builder
 * only checks if an individual field satisfies the syntactic
 * requirement (is well-formed), but does not validate the value
 * itself.  See {@link Builder} for details.
 *
 * Unicode locale/language extension
 *
 * UTS#35, "Unicode Locale Data Markup Language" defines optional
 * attributes and keywords to override or refine the default behavior
 * associated with a locale.  A keyword is represented by a pair of
 * key and type.  For example, "nu-thai" indicates that Thai local
 * digits (value:"thai") should be used for formatting numbers
 * (key:"nu").
 *
 * The keywords are mapped to a BCP 47 extension value using the
 * extension key 'u' ({@link #UNICODE_LOCALE_EXTENSION}).  The above
 * example, "nu-thai", becomes the extension "u-nu-thai".
 *
 * Thus, when a Locale object contains Unicode locale
 * attributes and keywords,
 * getExtension(UNICODE_LOCALE_EXTENSION) will return a
 * String representing this information, for example, "nu-thai".  The
 * Locale class also provides {@link
 * #getUnicodeLocaleAttributes}, {@link #getUnicodeLocaleKeys}, and
 * {@link #getUnicodeLocaleType} which allow you to access Unicode
 * locale attributes and key/type pairs directly.  When represented as
 * a string, the Unicode Locale Extension lists attributes
 * alphabetically, followed by key/type sequences with keys listed
 * alphabetically (the order of subtags comprising a key's type is
 * fixed when the type is defined)
 *
 * A well-formed locale key has the form
 * [0-9a-zA-Z]{2}.  A well-formed locale type has the
 * form "" | [0-9a-zA-Z]{3,8} ('-' [0-9a-zA-Z]{3,8})* (it
 * can be empty, or a series of subtags 3-8 alphanums in length).  A
 * well-formed locale attribute has the form
 * [0-9a-zA-Z]{3,8} (it is a single subtag with the same
 * form as a locale type subtag).
 *
 * The Unicode locale extension specifies optional behavior in
 * locale-sensitive services.  Although the LDML specification defines
 * various keys and values, actual locale-sensitive service
 * implementations in a Java Runtime Environment might not support any
 * particular Unicode locale attributes or key/type pairs.
 *
 * Creating a Locale
 *
 * There are several different ways to create a Locale
 * object.
 *
 * Builder
 *
 * Using {@link Builder} you can construct a Locale object
 * that conforms to BCP 47 syntax.
 *
 * Constructors
 *
 * The Locale class provides three constructors:
 * 
 *  *     {@link #Locale(String language)}
 *     {@link #Locale(String language, String country)}
 *     {@link #Locale(String language, String country, String variant)}
 * 
 * 
 * These constructors allow you to create a Locale object
 * with language, country and variant, but you cannot specify
 * script or extensions.
 *
 * Factory Methods
 *
 * The method {@link #forLanguageTag} creates a Locale
 * object for a well-formed BCP 47 language tag.
 *
 * Locale Constants
 *
 * The Locale class provides a number of convenient constants
 * that you can use to create Locale objects for commonly used
 * locales. For example, the following creates a Locale object
 * for the United States:
 * 
 *  *     Locale.US
 * 
 * 
 *
 * Locale Matching
 *
 * If an application or a system is internationalized and provides localized
 * resources for multiple locales, it sometimes needs to find one or more
 * locales (or language tags) which meet each user's specific preferences. Note
 * that a term "language tag" is used interchangeably with "locale" in this
 * locale matching documentation.
 *
 * In order to do matching a user's preferred locales to a set of language
 * tags, RFC 4647 Matching of
 * Language Tags defines two mechanisms: filtering and lookup.
 * Filtering is used to get all matching locales, whereas
 * lookup is to choose the best matching locale.
 * Matching is done case-insensitively. These matching mechanisms are described
 * in the following sections.
 *
 * A user's preference is called a Language Priority List and is
 * expressed as a list of language ranges. There are syntactically two types of
 * language ranges: basic and extended. See
 * {@link Locale.LanguageRange Locale.LanguageRange} for details.
 *
 * Filtering
 *
 * The filtering operation returns all matching language tags. It is defined
 * in RFC 4647 as follows:
 * "In filtering, each language range represents the least specific language
 * tag (that is, the language tag with fewest number of subtags) that is an
 * acceptable match. All of the language tags in the matching set of tags will
 * have an equal or greater number of subtags than the language range. Every
 * non-wildcard subtag in the language range will appear in every one of the
 * matching language tags."
 *
 * There are two types of filtering: filtering for basic language ranges
 * (called "basic filtering") and filtering for extended language ranges
 * (called "extended filtering"). They may return different results by what
 * kind of language ranges are included in the given Language Priority List.
 * {@link Locale.FilteringMode} is a parameter to specify how filtering should
 * be done.
 *
 * Lookup
 *
 * The lookup operation returns the best matching language tags. It is
 * defined in RFC 4647 as follows:
 * "By contrast with filtering, each language range represents the most
 * specific tag that is an acceptable match.  The first matching tag found,
 * according to the user's priority, is considered the closest match and is the
 * item returned."
 *
 * For example, if a Language Priority List consists of two language ranges,
 * `"zh-Hant-TW"` and `"en-US"`, in prioritized order, lookup
 * method progressively searches the language tags below in order to find the
 * best matching language tag.
 * 
 *  *    1. zh-Hant-TW
 *    2. zh-Hant
 *    3. zh
 *    4. en-US
 *    5. en
 * 
 * 
 * If there is a language tag which matches completely to a language range
 * above, the language tag is returned.
 *
 * `"*"` is the special language range, and it is ignored in lookup.
 *
 * If multiple language tags match as a result of the subtag `'*'`
 * included in a language range, the first matching language tag returned by
 * an {@link Iterator} over a {@link Collection} of language tags is treated as
 * the best matching one.
 *
 * Use of Locale
 *
 * Once you've created a Locale you can query it for information
 * about itself. Use getCountry to get the country (or region)
 * code and getLanguage to get the language code.
 * You can use getDisplayCountry to get the
 * name of the country suitable for displaying to the user. Similarly,
 * you can use getDisplayLanguage to get the name of
 * the language suitable for displaying to the user. Interestingly,
 * the getDisplayXXX methods are themselves locale-sensitive
 * and have two versions: one that uses the default
 * {@link Locale.Category#DISPLAY DISPLAY} locale and one
 * that uses the locale specified as an argument.
 *
 * The Java Platform provides a number of classes that perform locale-sensitive
 * operations. For example, the NumberFormat class formats
 * numbers, currency, and percentages in a locale-sensitive manner. Classes
 * such as NumberFormat have several convenience methods
 * for creating a default object of that type. For example, the
 * NumberFormat class provides these three convenience methods
 * for creating a default NumberFormat object:
 * 
 *  *     NumberFormat.getInstance()
 *     NumberFormat.getCurrencyInstance()
 *     NumberFormat.getPercentInstance()
 * 
 * 
 * Each of these methods has two variants; one with an explicit locale
 * and one without; the latter uses the default
 * {@link Locale.Category#FORMAT FORMAT} locale:
 * 
 *  *     NumberFormat.getInstance(myLocale)
 *     NumberFormat.getCurrencyInstance(myLocale)
 *     NumberFormat.getPercentInstance(myLocale)
 * 
 * 
 * A Locale is the mechanism for identifying the kind of object
 * (NumberFormat) that you would like to get. The locale is
 * just a mechanism for identifying objects,
 * not a container for the objects themselves.
 *
 * Compatibility
 *
 * In order to maintain compatibility with existing usage, Locale's
 * constructors retain their behavior prior to the Java Runtime
 * Environment version 1.7.  The same is largely true for the
 * toString method. Thus Locale objects can continue to
 * be used as they were. In particular, clients who parse the output
 * of toString into language, country, and variant fields can continue
 * to do so (although this is strongly discouraged), although the
 * variant field will have additional information in it if script or
 * extensions are present.
 *
 * In addition, BCP 47 imposes syntax restrictions that are not
 * imposed by Locale's constructors. This means that conversions
 * between some Locales and BCP 47 language tags cannot be made without
 * losing information. Thus toLanguageTag cannot
 * represent the state of locales whose language, country, or variant
 * do not conform to BCP 47.
 *
 * Because of these issues, it is recommended that clients migrate
 * away from constructing non-conforming locales and use the
 * forLanguageTag and Locale.Builder APIs instead.
 * Clients desiring a string representation of the complete locale can
 * then always rely on toLanguageTag for this purpose.
 *
 * Special cases
 *
 * For compatibility reasons, two
 * non-conforming locales are treated as special cases.  These are
 * `ja_JP_JP` and `th_TH_TH`. These are ill-formed
 * in BCP 47 since the variants are too short. To ease migration to BCP 47,
 * these are treated specially during construction.  These two cases (and only
 * these) cause a constructor to generate an extension, all other values behave
 * exactly as they did prior to Java 7.
 *
 * Java has used `ja_JP_JP` to represent Japanese as used in
 * Japan together with the Japanese Imperial calendar. This is now
 * representable using a Unicode locale extension, by specifying the
 * Unicode locale key `ca` (for "calendar") and type
 * `japanese`. When the Locale constructor is called with the
 * arguments "ja", "JP", "JP", the extension "u-ca-japanese" is
 * automatically added.
 *
 * Java has used `th_TH_TH` to represent Thai as used in
 * Thailand together with Thai digits. This is also now representable using
 * a Unicode locale extension, by specifying the Unicode locale key
 * `nu` (for "number") and value `thai`. When the Locale
 * constructor is called with the arguments "th", "TH", "TH", the
 * extension "u-nu-thai" is automatically added.
 *
 * Serialization
 *
 * During serialization, writeObject writes all fields to the output
 * stream, including extensions.
 *
 * During deserialization, readResolve adds extensions as described
 * in Special Cases, only
 * for the two cases th_TH_TH and ja_JP_JP.
 *
 * Legacy language codes
 *
 * Locale's constructor has always converted three language codes to
 * their earlier, obsoleted forms: `he` maps to `iw`,
 * `yi` maps to `ji`, and `id` maps to
 * `in`.  This continues to be the case, in order to not break
 * backwards compatibility.
 *
 * The APIs added in 1.7 map between the old and new language codes,
 * maintaining the old codes internal to Locale (so that
 * getLanguage and toString reflect the old
 * code), but using the new codes in the BCP 47 language tag APIs (so
 * that toLanguageTag reflects the new one). This
 * preserves the equivalence between Locales no matter which code or
 * API is used to construct them. Java's default resource bundle
 * lookup mechanism also implements this mapping, so that resources
 * can be named using either convention, see {@link ResourceBundle.Control}.
 *
 * Three-letter language/country(region) codes
 *
 * The Locale constructors have always specified that the language
 * and the country param be two characters in length, although in
 * practice they have accepted any length.  The specification has now
 * been relaxed to allow language codes of two to eight characters and
 * country (region) codes of two to three characters, and in
 * particular, three-letter language codes and three-digit region
 * codes as specified in the IANA Language Subtag Registry.  For
 * compatibility, the implementation still does not impose a length
 * constraint.
 *
 * @see Builder
 * @see ResourceBundle
 * @see java.text.Format
 * @see java.text.NumberFormat
 * @see java.text.Collator
 * @author Mark Davis
 * @since 1.1
*/
export class Locale {
  /**
   * Gets the current value of the default locale for this instance
   * of the Java Virtual Machine.
   * 
   * The Java Virtual Machine sets the default locale during startup
   * based on the host environment. It is used by many locale-sensitive
   * methods if no locale is explicitly specified.
   * It can be changed using the
   * {@link #setDefault(java.util.Locale) setDefault} method.
   *
   * @return the default locale for this instance of the Java Virtual Machine
  */
  static getDefault(): Locale;
  /**
   * Returns an array of all installed locales.
   * The returned array represents the union of locales supported
   * by the Java runtime environment and by installed
   * {@link java.util.spi.LocaleServiceProvider LocaleServiceProvider}
   * implementations.  It must contain at least a Locale
   * instance equal to {@link java.util.Locale#US Locale.US}.
   *
   * @return An array of installed locales.
  */
  static getAvailableLocales(): Locale[];
  /**
   * Returns a list of all 2-letter country codes defined in ISO 3166.
   * Can be used to create Locales.
   * This method is equivalent to {@link #getISOCountries(Locale.IsoCountryCode type)}
   * with `type`  {@link IsoCountryCode#PART1_ALPHA2}.
   * 
   * Note: The Locale class also supports other codes for
   * country (region), such as 3-letter numeric UN M.49 area codes.
   * Therefore, the list returned by this method does not contain ALL valid
   * codes that can be used to create Locales.
   * 
   * Note that this method does not return obsolete 2-letter country codes.
   * ISO3166-3 codes which designate country codes for those obsolete codes,
   * can be retrieved from {@link #getISOCountries(Locale.IsoCountryCode type)} with
   * `type`  {@link IsoCountryCode#PART3}.
   * @return An array of ISO 3166 two-letter country codes.
  */
  static getISOCountries(): string[];
  /**
   * Returns a list of all 2-letter language codes defined in ISO 639.
   * Can be used to create Locales.
   * 
   * Note:
   * 
   * ISO 639 is not a stable standard— some languages' codes have changed.
   * The list this function returns includes both the new and the old codes for the
   * languages whose codes have changed.
   * The Locale class also supports language codes up to
   * 8 characters in length.  Therefore, the list returned by this method does
   * not contain ALL valid codes that can be used to create Locales.
   * 
   *
   * @return An array of ISO 639 two-letter language codes.
  */
  static getISOLanguages(): string[];
  /**
   * Returns the language code of this Locale.
   *
   * Note: ISO 639 is not a stable standard— some languages' codes have changed.
   * Locale's constructor recognizes both the new and the old codes for the languages
   * whose codes have changed, but this function always returns the old code.  If you
   * want to check for a specific language whose code has changed, don't do
   *      * if (locale.getLanguage().equals("he")) // BAD!
   *    ...
   * 
   * Instead, do
   *      * if (locale.getLanguage().equals(new Locale("he").getLanguage()))
   *    ...
   * 
   * @return The language code, or the empty string if none is defined.
   * @see #getDisplayLanguage
  */
  getLanguage(): string;
  /**
   * Returns the script for this locale, which should
   * either be the empty string or an ISO 15924 4-letter script
   * code. The first letter is uppercase and the rest are
   * lowercase, for example, 'Latn', 'Cyrl'.
   *
   * @return The script code, or the empty string if none is defined.
   * @see #getDisplayScript
   * @since 1.7
  */
  getScript(): string;
  /**
   * Returns the country/region code for this locale, which should
   * either be the empty string, an uppercase ISO 3166 2-letter code,
   * or a UN M.49 3-digit code.
   *
   * @return The country/region code, or the empty string if none is defined.
   * @see #getDisplayCountry
  */
  getCountry(): string;
  /**
   * Returns the variant code for this locale.
   *
   * @return The variant code, or the empty string if none is defined.
   * @see #getDisplayVariant
  */
  getVariant(): string;
  /**
   * Returns the extension (or private use) value associated with
   * the specified key, or null if there is no extension
   * associated with the key. To be well-formed, the key must be one
   * of [0-9A-Za-z]. Keys are case-insensitive, so
   * for example 'z' and 'Z' represent the same extension.
   *
   * @param key the extension key
   * @return The extension, or null if this locale defines no
   * extension for the specified key.
   * @throws IllegalArgumentException if key is not well-formed
   * @see #PRIVATE_USE_EXTENSION
   * @see #UNICODE_LOCALE_EXTENSION
   * @since 1.7
  */
  getExtension(key: string): string;
  /**
   * Returns the set of extension keys associated with this locale, or the
   * empty set if it has no extensions. The returned set is unmodifiable.
   * The keys will all be lower-case.
   *
   * @return The set of extension keys, or the empty set if this locale has
   * no extensions.
   * @since 1.7
  */
  getExtensionKeys(): Set<string>;
  /**
   * Returns the set of unicode locale attributes associated with
   * this locale, or the empty set if it has no attributes. The
   * returned set is unmodifiable.
   *
   * @return The set of attributes.
   * @since 1.7
  */
  getUnicodeLocaleAttributes(): Set<string>;
  /**
   * Returns the Unicode locale type associated with the specified Unicode locale key
   * for this locale. Returns the empty string for keys that are defined with no type.
   * Returns null if the key is not defined. Keys are case-insensitive. The key must
   * be two alphanumeric characters ([0-9a-zA-Z]), or an IllegalArgumentException is
   * thrown.
   *
   * @param key the Unicode locale key
   * @return The Unicode locale type associated with the key, or null if the
   * locale does not define the key.
   * @throws IllegalArgumentException if the key is not well-formed
   * @throws NullPointerException if key is null
   * @since 1.7
  */
  getUnicodeLocaleType(key: string): string;
  /**
   * Returns the set of Unicode locale keys defined by this locale, or the empty set if
   * this locale has none.  The returned set is immutable.  Keys are all lower case.
   *
   * @return The set of Unicode locale keys, or the empty set if this locale has
   * no Unicode locale keywords.
   * @since 1.7
  */
  getUnicodeLocaleKeys(): Set<string>;
  /**
   * Returns a string representation of this Locale
   * object, consisting of language, country, variant, script,
   * and extensions as below:
   * 
   * language + "_" + country + "_" + (variant + "_#" | "#") + script + "_" + extensions
   * 
   *
   * Language is always lower case, country is always upper case, script is always title
   * case, and extensions are always lower case.  Extensions and private use subtags
   * will be in canonical order as explained in {@link #toLanguageTag}.
   *
   * When the locale has neither script nor extensions, the result is the same as in
   * Java 6 and prior.
   *
   * If both the language and country fields are missing, this function will return
   * the empty string, even if the variant, script, or extensions field is present (you
   * can't have a locale with just a variant, the variant must accompany a well-formed
   * language or country code).
   *
   * If script or extensions are present and variant is missing, no underscore is
   * added before the "#".
   *
   * This behavior is designed to support debugging and to be compatible with
   * previous uses of toString that expected language, country, and variant
   * fields only.  To represent a Locale as a String for interchange purposes, use
   * {@link #toLanguageTag}.
   *
   * Examples: 
   * `en`
   * `de_DE`
   * `_GB`
   * `en_US_WIN`
   * `de__POSIX`
   * `zh_CN_#Hans`
   * `zh_TW_#Hant_x-java`
   * `th_TH_TH_#u-nu-thai`
   *
   * @return A string representation of the Locale, for debugging.
   * @see #getDisplayName
   * @see #toLanguageTag
  */
  toString(): string;
  /**
   * Returns a three-letter abbreviation of this locale's language.
   * If the language matches an ISO 639-1 two-letter code, the
   * corresponding ISO 639-2/T three-letter lowercase code is
   * returned.  The ISO 639-2 language codes can be found on-line,
   * see "Codes for the Representation of Names of Languages Part 2:
   * Alpha-3 Code".  If the locale specifies a three-letter
   * language, the language is returned as is.  If the locale does
   * not specify a language the empty string is returned.
   *
   * @return A three-letter abbreviation of this locale's language.
   * @exception MissingResourceException Throws MissingResourceException if
   * three-letter language abbreviation is not available for this locale.
  */
  getISO3Language(): string;
  /**
   * Returns a three-letter abbreviation for this locale's country.
   * If the country matches an ISO 3166-1 alpha-2 code, the
   * corresponding ISO 3166-1 alpha-3 uppercase code is returned.
   * If the locale doesn't specify a country, this will be the empty
   * string.
   *
   * The ISO 3166-1 codes can be found on-line.
   *
   * @return A three-letter abbreviation of this locale's country.
   * @exception MissingResourceException Throws MissingResourceException if the
   * three-letter country abbreviation is not available for this locale.
  */
  getISO3Country(): string;
  /**
   * Returns a name for the locale's language that is appropriate for display to the
   * user.
   * If possible, the name returned will be localized for the default
   * {@link Locale.Category#DISPLAY DISPLAY} locale.
   * For example, if the locale is fr_FR and the default
   * {@link Locale.Category#DISPLAY DISPLAY} locale
   * is en_US, getDisplayLanguage() will return "French"; if the locale is en_US and
   * the default {@link Locale.Category#DISPLAY DISPLAY} locale is fr_FR,
   * getDisplayLanguage() will return "anglais".
   * If the name returned cannot be localized for the default
   * {@link Locale.Category#DISPLAY DISPLAY} locale,
   * (say, we don't have a Japanese name for Croatian),
   * this function falls back on the English name, and uses the ISO code as a last-resort
   * value.  If the locale doesn't specify a language, this function returns the empty string.
   *
   * @return The name of the display language.
  */
  getDisplayLanguage(): string;
  /**
   * Returns a name for the locale's language that is appropriate for display to the
   * user.
   * If possible, the name returned will be localized according to inLocale.
   * For example, if the locale is fr_FR and inLocale
   * is en_US, getDisplayLanguage() will return "French"; if the locale is en_US and
   * inLocale is fr_FR, getDisplayLanguage() will return "anglais".
   * If the name returned cannot be localized according to inLocale,
   * (say, we don't have a Japanese name for Croatian),
   * this function falls back on the English name, and finally
   * on the ISO code as a last-resort value.  If the locale doesn't specify a language,
   * this function returns the empty string.
   *
   * @param inLocale The locale for which to retrieve the display language.
   * @return The name of the display language appropriate to the given locale.
   * @exception NullPointerException if inLocale is null
  */
  getDisplayLanguage(inLocale: Locale): string;
  /**
   * Returns a name for the locale's script that is appropriate for display to
   * the user. If possible, the name will be localized for the default
   * {@link Locale.Category#DISPLAY DISPLAY} locale.  Returns
   * the empty string if this locale doesn't specify a script code.
   *
   * @return the display name of the script code for the current default
   *     {@link Locale.Category#DISPLAY DISPLAY} locale
   * @since 1.7
  */
  getDisplayScript(): string;
  /**
   * Returns a name for the locale's script that is appropriate
   * for display to the user. If possible, the name will be
   * localized for the given locale. Returns the empty string if
   * this locale doesn't specify a script code.
   *
   * @param inLocale The locale for which to retrieve the display script.
   * @return the display name of the script code for the current default
   * {@link Locale.Category#DISPLAY DISPLAY} locale
   * @throws NullPointerException if inLocale is null
   * @since 1.7
  */
  getDisplayScript(inLocale: Locale): string;
  /**
   * Returns a name for the locale's country that is appropriate for display to the
   * user.
   * If possible, the name returned will be localized for the default
   * {@link Locale.Category#DISPLAY DISPLAY} locale.
   * For example, if the locale is fr_FR and the default
   * {@link Locale.Category#DISPLAY DISPLAY} locale
   * is en_US, getDisplayCountry() will return "France"; if the locale is en_US and
   * the default {@link Locale.Category#DISPLAY DISPLAY} locale is fr_FR,
   * getDisplayCountry() will return "Etats-Unis".
   * If the name returned cannot be localized for the default
   * {@link Locale.Category#DISPLAY DISPLAY} locale,
   * (say, we don't have a Japanese name for Croatia),
   * this function falls back on the English name, and uses the ISO code as a last-resort
   * value.  If the locale doesn't specify a country, this function returns the empty string.
   *
   * @return The name of the country appropriate to the locale.
  */
  getDisplayCountry(): string;
  /**
   * Returns a name for the locale's country that is appropriate for display to the
   * user.
   * If possible, the name returned will be localized according to inLocale.
   * For example, if the locale is fr_FR and inLocale
   * is en_US, getDisplayCountry() will return "France"; if the locale is en_US and
   * inLocale is fr_FR, getDisplayCountry() will return "Etats-Unis".
   * If the name returned cannot be localized according to inLocale.
   * (say, we don't have a Japanese name for Croatia),
   * this function falls back on the English name, and finally
   * on the ISO code as a last-resort value.  If the locale doesn't specify a country,
   * this function returns the empty string.
   *
   * @param inLocale The locale for which to retrieve the display country.
   * @return The name of the country appropriate to the given locale.
   * @exception NullPointerException if inLocale is null
  */
  getDisplayCountry(inLocale: Locale): string;
  /**
   * Returns a name for the locale's variant code that is appropriate for display to the
   * user.  If possible, the name will be localized for the default
   * {@link Locale.Category#DISPLAY DISPLAY} locale.  If the locale
   * doesn't specify a variant code, this function returns the empty string.
   *
   * @return The name of the display variant code appropriate to the locale.
  */
  getDisplayVariant(): string;
  /**
   * Returns a name for the locale's variant code that is appropriate for display to the
   * user.  If possible, the name will be localized for inLocale.  If the locale
   * doesn't specify a variant code, this function returns the empty string.
   *
   * @param inLocale The locale for which to retrieve the display variant code.
   * @return The name of the display variant code appropriate to the given locale.
   * @exception NullPointerException if inLocale is null
  */
  getDisplayVariant(inLocale: Locale): string;
  /**
   * Returns a name for the locale that is appropriate for display to the
   * user. This will be the values returned by getDisplayLanguage(),
   * getDisplayScript(), getDisplayCountry(), getDisplayVariant() and
   * optional Unicode extensions
   * assembled into a single string. The non-empty values are used in order, with
   * the second and subsequent names in parentheses.  For example:
   * 
   * language (script, country, variant(, extension)*)
   * language (country(, extension)*)
   * language (variant(, extension)*)
   * script (country(, extension)*)
   * country (extension)*
   * 
   * depending on which fields are specified in the locale. The field
   * separator in the above parentheses, denoted as a comma character, may
   * be localized depending on the locale. If the language, script, country,
   * and variant fields are all empty, this function returns the empty string.
   *
   * @return The name of the locale appropriate to display.
  */
  getDisplayName(): string;
  /**
   * Returns a name for the locale that is appropriate for display
   * to the user.  This will be the values returned by
   * getDisplayLanguage(), getDisplayScript(),getDisplayCountry()
   * getDisplayVariant(), and optional 
   * Unicode extensions assembled into a single string. The non-empty
   * values are used in order, with the second and subsequent names in
   * parentheses.  For example:
   * 
   * language (script, country, variant(, extension)*)
   * language (country(, extension)*)
   * language (variant(, extension)*)
   * script (country(, extension)*)
   * country (extension)*
   * 
   * depending on which fields are specified in the locale. The field
   * separator in the above parentheses, denoted as a comma character, may
   * be localized depending on the locale. If the language, script, country,
   * and variant fields are all empty, this function returns the empty string.
   *
   * @param inLocale The locale for which to retrieve the display name.
   * @return The name of the locale appropriate to display.
   * @throws NullPointerException if inLocale is null
  */
  getDisplayName(inLocale: Locale): string;
}
/**
 * An object that maps keys to values.  A map cannot contain duplicate keys;
 * each key can map to at most one value.
 *
 * This interface takes the place of the `Dictionary` class, which
 * was a totally abstract class rather than an interface.
 *
 * The `Map` interface provides three collection views, which
 * allow a map's contents to be viewed as a set of keys, collection of values,
 * or set of key-value mappings.  The order of a map is defined as
 * the order in which the iterators on the map's collection views return their
 * elements.  Some map implementations, like the `TreeMap` class, make
 * specific guarantees as to their order; others, like the `HashMap`
 * class, do not.
 *
 * Note: great care must be exercised if mutable objects are used as map
 * keys.  The behavior of a map is not specified if the value of an object is
 * changed in a manner that affects `equals` comparisons while the
 * object is a key in the map.  A special case of this prohibition is that it
 * is not permissible for a map to contain itself as a key.  While it is
 * permissible for a map to contain itself as a value, extreme caution is
 * advised: the `equals` and `hashCode` methods are no longer
 * well defined on such a map.
 *
 * All general-purpose map implementation classes should provide two
 * "standard" constructors: a void (no arguments) constructor which creates an
 * empty map, and a constructor with a single argument of type `Map`,
 * which creates a new map with the same key-value mappings as its argument.
 * In effect, the latter constructor allows the user to copy any map,
 * producing an equivalent map of the desired class.  There is no way to
 * enforce this recommendation (as interfaces cannot contain constructors) but
 * all of the general-purpose map implementations in the JDK comply.
 *
 * The "destructive" methods contained in this interface, that is, the
 * methods that modify the map on which they operate, are specified to throw
 * `UnsupportedOperationException` if this map does not support the
 * operation.  If this is the case, these methods may, but are not required
 * to, throw an `UnsupportedOperationException` if the invocation would
 * have no effect on the map.  For example, invoking the {@link #putAll(Map)}
 * method on an unmodifiable map may, but is not required to, throw the
 * exception if the map whose mappings are to be "superimposed" is empty.
 *
 * Some map implementations have restrictions on the keys and values they
 * may contain.  For example, some implementations prohibit null keys and
 * values, and some have restrictions on the types of their keys.  Attempting
 * to insert an ineligible key or value throws an unchecked exception,
 * typically `NullPointerException` or `ClassCastException`.
 * Attempting to query the presence of an ineligible key or value may throw an
 * exception, or it may simply return false; some implementations will exhibit
 * the former behavior and some will exhibit the latter.  More generally,
 * attempting an operation on an ineligible key or value whose completion
 * would not result in the insertion of an ineligible element into the map may
 * throw an exception or it may succeed, at the option of the implementation.
 * Such exceptions are marked as "optional" in the specification for this
 * interface.
 *
 * Many methods in Collections Framework interfaces are defined
 * in terms of the {@link Object#equals(Object) equals} method.  For
 * example, the specification for the {@link #containsKey(Object)
 * containsKey(Object key)} method says: "returns `true` if and
 * only if this map contains a mapping for a key `k` such that
 * `(key==null ? k==null : key.equals(k))`." This specification should
 * not be construed to imply that invoking `Map.containsKey`
 * with a non-null argument `key` will cause `key.equals(k)` to
 * be invoked for any key `k`.  Implementations are free to
 * implement optimizations whereby the `equals` invocation is avoided,
 * for example, by first comparing the hash codes of the two keys.  (The
 * {@link Object#hashCode()} specification guarantees that two objects with
 * unequal hash codes cannot be equal.)  More generally, implementations of
 * the various Collections Framework interfaces are free to take advantage of
 * the specified behavior of underlying {@link Object} methods wherever the
 * implementor deems it appropriate.
 *
 * Some map operations which perform recursive traversal of the map may fail
 * with an exception for self-referential instances where the map directly or
 * indirectly contains itself. This includes the `clone()`,
 * `equals()`, `hashCode()` and `toString()` methods.
 * Implementations may optionally handle the self-referential scenario, however
 * most current implementations do not do so.
 *
 * Unmodifiable Maps
 * The {@link Map#of() Map.of},
 * {@link Map#ofEntries(Map.Entry...) Map.ofEntries}, and
 * {@link Map#copyOf Map.copyOf}
 * static factory methods provide a convenient way to create unmodifiable maps.
 * The `Map`
 * instances created by these methods have the following characteristics:
 *
 * 
 * They are unmodifiable. Keys and values
 * cannot be added, removed, or updated. Calling any mutator method on the Map
 * will always cause `UnsupportedOperationException` to be thrown.
 * However, if the contained keys or values are themselves mutable, this may cause the
 * Map to behave inconsistently or its contents to appear to change.
 * They disallow `null` keys and values. Attempts to create them with
 * `null` keys or values result in `NullPointerException`.
 * They are serializable if all keys and values are serializable.
 * They reject duplicate keys at creation time. Duplicate keys
 * passed to a static factory method result in `IllegalArgumentException`.
 * The iteration order of mappings is unspecified and is subject to change.
 * They are value-based.
 * Callers should make no assumptions about the identity of the returned instances.
 * Factories are free to create new instances or reuse existing ones. Therefore,
 * identity-sensitive operations on these instances (reference equality (`==`),
 * identity hash code, and synchronization) are unreliable and should be avoided.
 * They are serialized as specified on the
 * Serialized Form
 * page.
 * 
 *
 * This interface is a member of the
 * 
 * Java Collections Framework.
 *
 * @param  the type of keys maintained by this map
 * @param  the type of mapped values
 *
 * @author  Josh Bloch
 * @see HashMap
 * @see TreeMap
 * @see Hashtable
 * @see SortedMap
 * @see Collection
 * @see Set
 * @since 1.2
*/
export class Map<K, V> {
  /**
   * Returns the number of key-value mappings in this map.  If the
   * map contains more than `Integer.MAX_VALUE` elements, returns
   * `Integer.MAX_VALUE`.
   *
   * @return the number of key-value mappings in this map
  */
  size(): number;
  /**
   * Returns `true` if this map contains no key-value mappings.
   *
   * @return `true` if this map contains no key-value mappings
  */
  isEmpty(): boolean;
  /**
   * Returns `true` if this map contains a mapping for the specified
   * key.  More formally, returns `true` if and only if
   * this map contains a mapping for a key `k` such that
   * `Objects.equals(key, k)`.  (There can be
   * at most one such mapping.)
   *
   * @param key key whose presence in this map is to be tested
   * @return `true` if this map contains a mapping for the specified
   *         key
   * @throws ClassCastException if the key is of an inappropriate type for
   *         this map
   * (optional)
   * @throws NullPointerException if the specified key is null and this map
   *         does not permit null keys
   * (optional)
  */
  containsKey(key: any): boolean;
  /**
   * Returns the value to which the specified key is mapped,
   * or `null` if this map contains no mapping for the key.
   *
   * More formally, if this map contains a mapping from a key
   * `k` to a value `v` such that
   * `Objects.equals(key, k)`,
   * then this method returns `v`; otherwise
   * it returns `null`.  (There can be at most one such mapping.)
   *
   * If this map permits null values, then a return value of
   * `null` does not necessarily indicate that the map
   * contains no mapping for the key; it's also possible that the map
   * explicitly maps the key to `null`.  The {@link #containsKey
   * containsKey} operation may be used to distinguish these two cases.
   *
   * @param key the key whose associated value is to be returned
   * @return the value to which the specified key is mapped, or
   *         `null` if this map contains no mapping for the key
   * @throws ClassCastException if the key is of an inappropriate type for
   *         this map
   * (optional)
   * @throws NullPointerException if the specified key is null and this map
   *         does not permit null keys
   * (optional)
  */
  get(key: any): V;
  /**
   * Associates the specified value with the specified key in this map
   * (optional operation).  If the map previously contained a mapping for
   * the key, the old value is replaced by the specified value.  (A map
   * `m` is said to contain a mapping for a key `k` if and only
   * if {@link #containsKey(Object) m.containsKey(k)} would return
   * `true`.)
   *
   * @param key key with which the specified value is to be associated
   * @param value value to be associated with the specified key
   * @return the previous value associated with `key`, or
   *         `null` if there was no mapping for `key`.
   *         (A `null` return can also indicate that the map
   *         previously associated `null` with `key`,
   *         if the implementation supports `null` values.)
   * @throws UnsupportedOperationException if the `put` operation
   *         is not supported by this map
   * @throws ClassCastException if the class of the specified key or value
   *         prevents it from being stored in this map
   * @throws NullPointerException if the specified key or value is null
   *         and this map does not permit null keys or values
   * @throws IllegalArgumentException if some property of the specified key
   *         or value prevents it from being stored in this map
  */
  put(key: K, value: V): V;
  /**
   * Copies all of the mappings from the specified map to this map
   * (optional operation).  The effect of this call is equivalent to that
   * of calling {@link #put(Object,Object) put(k, v)} on this map once
   * for each mapping from key `k` to value `v` in the
   * specified map.  The behavior of this operation is undefined if the
   * specified map is modified while the operation is in progress.
   *
   * @param m mappings to be stored in this map
   * @throws UnsupportedOperationException if the `putAll` operation
   *         is not supported by this map
   * @throws ClassCastException if the class of a key or value in the
   *         specified map prevents it from being stored in this map
   * @throws NullPointerException if the specified map is null, or if
   *         this map does not permit null keys or values, and the
   *         specified map contains null keys or values
   * @throws IllegalArgumentException if some property of a key or value in
   *         the specified map prevents it from being stored in this map
  */
  putAll(m: Map<K, V>): void;
  /**
   * Returns the value to which the specified key is mapped, or
   * `defaultValue` if this map contains no mapping for the key.
   *
   * @implSpec
   * The default implementation makes no guarantees about synchronization
   * or atomicity properties of this method. Any implementation providing
   * atomicity guarantees must override this method and document its
   * concurrency properties.
   *
   * @param key the key whose associated value is to be returned
   * @param defaultValue the default mapping of the key
   * @return the value to which the specified key is mapped, or
   * `defaultValue` if this map contains no mapping for the key
   * @throws ClassCastException if the key is of an inappropriate type for
   * this map
   * (optional)
   * @throws NullPointerException if the specified key is null and this map
   * does not permit null keys
   * (optional)
   * @since 1.8
  */
  getOrDefault(key: any, defaultValue: V): V;
  /**
   * If the specified key is not already associated with a value (or is mapped
   * to `null`) associates it with the given value and returns
   * `null`, else returns the current value.
   *
   * @implSpec
   * The default implementation is equivalent to, for this `     * map`:
   *
   *  {@code
   * V v = map.get(key);
   * if (v == null)
   *     v = map.put(key, value);
   *
   * return v;
   * }
   *
   * The default implementation makes no guarantees about synchronization
   * or atomicity properties of this method. Any implementation providing
   * atomicity guarantees must override this method and document its
   * concurrency properties.
   *
   * @param key key with which the specified value is to be associated
   * @param value value to be associated with the specified key
   * @return the previous value associated with the specified key, or
   *         `null` if there was no mapping for the key.
   *         (A `null` return can also indicate that the map
   *         previously associated `null` with the key,
   *         if the implementation supports null values.)
   * @throws UnsupportedOperationException if the `put` operation
   *         is not supported by this map
   *         (optional)
   * @throws ClassCastException if the key or value is of an inappropriate
   *         type for this map
   *         (optional)
   * @throws NullPointerException if the specified key or value is null,
   *         and this map does not permit null keys or values
   *         (optional)
   * @throws IllegalArgumentException if some property of the specified key
   *         or value prevents it from being stored in this map
   *         (optional)
   * @since 1.8
  */
  putIfAbsent(key: K, value: V): V;
}
export class Set<E> {
  /**
   * Returns the number of elements in this set (its cardinality).  If this
   * set contains more than `Integer.MAX_VALUE` elements, returns
   * `Integer.MAX_VALUE`.
   *
   * @return the number of elements in this set (its cardinality)
  */
  size(): number;
  /**
   * Returns `true` if this set contains no elements.
   *
   * @return `true` if this set contains no elements
  */
  isEmpty(): boolean;
  /**
   * Returns `true` if this set contains the specified element.
   * More formally, returns `true` if and only if this set
   * contains an element `e` such that
   * `Objects.equals(o, e)`.
   *
   * @param o element whose presence in this set is to be tested
   * @return `true` if this set contains the specified element
   * @throws ClassCastException if the type of the specified element
   *         is incompatible with this set
   * (optional)
   * @throws NullPointerException if the specified element is null and this
   *         set does not permit null elements
   * (optional)
  */
  contains(o: any): boolean;
  /**
   * Returns an iterator over the elements in this set.  The elements are
   * returned in no particular order (unless this set is an instance of some
   * class that provides a guarantee).
   *
   * @return an iterator over the elements in this set
  */
  iterator(): Iterator<E>;
  /**
   * Adds the specified element to this set if it is not already present
   * (optional operation).  More formally, adds the specified element
   * `e` to this set if the set contains no element `e2`
   * such that
   * `Objects.equals(e, e2)`.
   * If this set already contains the element, the call leaves the set
   * unchanged and returns `false`.  In combination with the
   * restriction on constructors, this ensures that sets never contain
   * duplicate elements.
   *
   * The stipulation above does not imply that sets must accept all
   * elements; sets may refuse to add any particular element, including
   * `null`, and throw an exception, as described in the
   * specification for {@link Collection#add Collection.add}.
   * Individual set implementations should clearly document any
   * restrictions on the elements that they may contain.
   *
   * @param e element to be added to this set
   * @return `true` if this set did not already contain the specified
   *         element
   * @throws UnsupportedOperationException if the `add` operation
   *         is not supported by this set
   * @throws ClassCastException if the class of the specified element
   *         prevents it from being added to this set
   * @throws NullPointerException if the specified element is null and this
   *         set does not permit null elements
   * @throws IllegalArgumentException if some property of the specified element
   *         prevents it from being added to this set
  */
  add(e: E): boolean;
}

}
