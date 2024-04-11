declare module 'java.io' {
import { Locale } from 'java.util';
export class BufferedReader {
  /**
   * Reads a single character.
   *
   * @return The character read, as an integer in the range
   *         0 to 65535 (`0x00-0xffff`), or -1 if the
   *         end of the stream has been reached
   * @exception  IOException  If an I/O error occurs
  */
  read(): number;
  /**
   * Reads characters into a portion of an array.
   *
   *  This method implements the general contract of the corresponding
   * {@link Reader#read(char[], int, int) read} method of the
   * {@link Reader} class.  As an additional convenience, it
   * attempts to read as many characters as possible by repeatedly invoking
   * the read method of the underlying stream.  This iterated
   * read continues until one of the following conditions becomes
   * true: 
   *
   *    The specified number of characters have been read,
   *
   *    The read method of the underlying stream returns
   *   -1, indicating end-of-file, or
   *
   *    The ready method of the underlying stream
   *   returns false, indicating that further input requests
   *   would block.
   *
   *  If the first read on the underlying stream returns
   * -1 to indicate end-of-file then this method returns
   * -1.  Otherwise this method returns the number of characters
   * actually read.
   *
   *  Subclasses of this class are encouraged, but not required, to
   * attempt to read as many characters as possible in the same fashion.
   *
   *  Ordinarily this method takes characters from this stream's character
   * buffer, filling it from the underlying stream as necessary.  If,
   * however, the buffer is empty, the mark is not valid, and the requested
   * length is at least as large as the buffer, then this method will read
   * characters directly from the underlying stream into the given array.
   * Thus redundant BufferedReaders will not copy data
   * unnecessarily.
   *
   * @param      cbuf  Destination buffer
   * @param      off   Offset at which to start storing characters
   * @param      len   Maximum number of characters to read
   *
   * @return     The number of characters read, or -1 if the end of the
   *             stream has been reached
   *
   * @exception  IOException  If an I/O error occurs
   * @exception  IndexOutOfBoundsException {@inheritDoc}
  */
  read(cbuf: string[], off: number, len: number): number;
  /**
   * Reads a line of text.  A line is considered to be terminated by any one
   * of a line feed ('\n'), a carriage return ('\r'), a carriage return
   * followed immediately by a line feed, or by reaching the end-of-file
   * (EOF).
   *
   * @return     A String containing the contents of the line, not including
   *             any line-termination characters, or null if the end of the
   *             stream has been reached without reading any characters
   *
   * @exception  IOException  If an I/O error occurs
   *
   * @see java.nio.file.Files#readAllLines
  */
  readLine(): string;
  /**
   * Tells whether this stream is ready to be read.  A buffered character
   * stream is ready if the buffer is not empty, or if the underlying
   * character stream is ready.
   *
   * @exception  IOException  If an I/O error occurs
  */
  ready(): boolean;
}
export class File {
  /**
   * Returns the name of the file or directory denoted by this abstract
   * pathname.  This is just the last name in the pathname's name
   * sequence.  If the pathname's name sequence is empty, then the empty
   * string is returned.
   *
   * @return  The name of the file or directory denoted by this abstract
   *          pathname, or the empty string if this pathname's name sequence
   *          is empty
  */
  getName(): string;
  /**
   * Returns the pathname string of this abstract pathname's parent, or
   * null if this pathname does not name a parent directory.
   *
   *  The parent of an abstract pathname consists of the
   * pathname's prefix, if any, and each name in the pathname's name
   * sequence except for the last.  If the name sequence is empty then
   * the pathname does not name a parent directory.
   *
   * @return  The pathname string of the parent directory named by this
   *          abstract pathname, or null if this pathname
   *          does not name a parent
  */
  getParent(): string;
  /**
   * Returns the abstract pathname of this abstract pathname's parent,
   * or null if this pathname does not name a parent
   * directory.
   *
   *  The parent of an abstract pathname consists of the
   * pathname's prefix, if any, and each name in the pathname's name
   * sequence except for the last.  If the name sequence is empty then
   * the pathname does not name a parent directory.
   *
   * @return  The abstract pathname of the parent directory named by this
   *          abstract pathname, or null if this pathname
   *          does not name a parent
   *
   * @since 1.2
  */
  getParentFile(): File;
  /**
   * Converts this abstract pathname into a pathname string.  The resulting
   * string uses the {@link #separator default name-separator character} to
   * separate the names in the name sequence.
   *
   * @return  The string form of this abstract pathname
  */
  getPath(): string;
  /**
   * Tests whether this abstract pathname is absolute.  The definition of
   * absolute pathname is system dependent.  On UNIX systems, a pathname is
   * absolute if its prefix is "/".  On Microsoft Windows systems, a
   * pathname is absolute if its prefix is a drive specifier followed by
   * "\\", or if its prefix is "\\\\".
   *
   * @return  true if this abstract pathname is absolute,
   *          false otherwise
  */
  isAbsolute(): boolean;
  /**
   * Returns the absolute pathname string of this abstract pathname.
   *
   *  If this abstract pathname is already absolute, then the pathname
   * string is simply returned as if by the {@link #getPath}
   * method.  If this abstract pathname is the empty abstract pathname then
   * the pathname string of the current user directory, which is named by the
   * system property user.dir, is returned.  Otherwise this
   * pathname is resolved in a system-dependent way.  On UNIX systems, a
   * relative pathname is made absolute by resolving it against the current
   * user directory.  On Microsoft Windows systems, a relative pathname is made absolute
   * by resolving it against the current directory of the drive named by the
   * pathname, if any; if not, it is resolved against the current user
   * directory.
   *
   * @return  The absolute pathname string denoting the same file or
   *          directory as this abstract pathname
   *
   * @throws  SecurityException
   *          If a required system property value cannot be accessed.
   *
   * @see     java.io.File#isAbsolute()
  */
  getAbsolutePath(): string;
  /**
   * Returns the absolute form of this abstract pathname.  Equivalent to
   * new File(this.{@link #getAbsolutePath}).
   *
   * @return  The absolute abstract pathname denoting the same file or
   *          directory as this abstract pathname
   *
   * @throws  SecurityException
   *          If a required system property value cannot be accessed.
   *
   * @since 1.2
  */
  getAbsoluteFile(): File;
  /**
   * Returns the canonical pathname string of this abstract pathname.
   *
   *  A canonical pathname is both absolute and unique.  The precise
   * definition of canonical form is system-dependent.  This method first
   * converts this pathname to absolute form if necessary, as if by invoking the
   * {@link #getAbsolutePath} method, and then maps it to its unique form in a
   * system-dependent way.  This typically involves removing redundant names
   * such as `"."` and `".."` from the pathname, resolving
   * symbolic links (on UNIX platforms), and converting drive letters to a
   * standard case (on Microsoft Windows platforms).
   *
   *  Every pathname that denotes an existing file or directory has a
   * unique canonical form.  Every pathname that denotes a nonexistent file
   * or directory also has a unique canonical form.  The canonical form of
   * the pathname of a nonexistent file or directory may be different from
   * the canonical form of the same pathname after the file or directory is
   * created.  Similarly, the canonical form of the pathname of an existing
   * file or directory may be different from the canonical form of the same
   * pathname after the file or directory is deleted.
   *
   * @return  The canonical pathname string denoting the same file or
   *          directory as this abstract pathname
   *
   * @throws  IOException
   *          If an I/O error occurs, which is possible because the
   *          construction of the canonical pathname may require
   *          filesystem queries
   *
   * @throws  SecurityException
   *          If a required system property value cannot be accessed, or
   *          if a security manager exists and its {@link
   *          java.lang.SecurityManager#checkRead} method denies
   *          read access to the file
   *
   * @since   1.1
   * @see     Path#toRealPath
  */
  getCanonicalPath(): string;
  /**
   * Returns the canonical form of this abstract pathname.  Equivalent to
   * new File(this.{@link #getCanonicalPath}).
   *
   * @return  The canonical pathname string denoting the same file or
   *          directory as this abstract pathname
   *
   * @throws  IOException
   *          If an I/O error occurs, which is possible because the
   *          construction of the canonical pathname may require
   *          filesystem queries
   *
   * @throws  SecurityException
   *          If a required system property value cannot be accessed, or
   *          if a security manager exists and its {@link
   *          java.lang.SecurityManager#checkRead} method denies
   *          read access to the file
   *
   * @since 1.2
   * @see     Path#toRealPath
  */
  getCanonicalFile(): File;
  /**
   * Tests whether the file denoted by this abstract pathname is a
   * directory.
   *
   *  Where it is required to distinguish an I/O exception from the case
   * that the file is not a directory, or where several attributes of the
   * same file are required at the same time, then the {@link
   * java.nio.file.Files#readAttributes(Path,Class,LinkOption[])
   * Files.readAttributes} method may be used.
   *
   * @return true if and only if the file denoted by this
   *          abstract pathname exists and is a directory;
   *          false otherwise
   *
   * @throws  SecurityException
   *          If a security manager exists and its {@link
   *          java.lang.SecurityManager#checkRead(java.lang.String)}
   *          method denies read access to the file
  */
  isDirectory(): boolean;
  /**
   * Tests whether the file denoted by this abstract pathname is a normal
   * file.  A file is normal if it is not a directory and, in
   * addition, satisfies other system-dependent criteria.  Any non-directory
   * file created by a Java application is guaranteed to be a normal file.
   *
   *  Where it is required to distinguish an I/O exception from the case
   * that the file is not a normal file, or where several attributes of the
   * same file are required at the same time, then the {@link
   * java.nio.file.Files#readAttributes(Path,Class,LinkOption[])
   * Files.readAttributes} method may be used.
   *
   * @return  true if and only if the file denoted by this
   *          abstract pathname exists and is a normal file;
   *          false otherwise
   *
   * @throws  SecurityException
   *          If a security manager exists and its {@link
   *          java.lang.SecurityManager#checkRead(java.lang.String)}
   *          method denies read access to the file
  */
  isFile(): boolean;
  /**
   * Tests whether the file named by this abstract pathname is a hidden
   * file.  The exact definition of hidden is system-dependent.  On
   * UNIX systems, a file is considered to be hidden if its name begins with
   * a period character ('.').  On Microsoft Windows systems, a file is
   * considered to be hidden if it has been marked as such in the filesystem.
   *
   * @return  true if and only if the file denoted by this
   *          abstract pathname is hidden according to the conventions of the
   *          underlying platform
   *
   * @throws  SecurityException
   *          If a security manager exists and its {@link
   *          java.lang.SecurityManager#checkRead(java.lang.String)}
   *          method denies read access to the file
   *
   * @since 1.2
  */
  isHidden(): boolean;
  /**
   * Returns the size of the partition named by this
   * abstract pathname.
   *
   * @return  The size, in bytes, of the partition or `0L` if this
   *          abstract pathname does not name a partition
   *
   * @throws  SecurityException
   *          If a security manager has been installed and it denies
   *          {@link RuntimePermission}`("getFileSystemAttributes")`
   *          or its {@link SecurityManager#checkRead(String)} method denies
   *          read access to the file named by this abstract pathname
   *
   * @since  1.6
  */
  getTotalSpace(): number;
  /**
   * Returns the number of unallocated bytes in the partition named by this abstract path name.
   *
   *  The returned number of unallocated bytes is a hint, but not
   * a guarantee, that it is possible to use most or any of these
   * bytes.  The number of unallocated bytes is most likely to be
   * accurate immediately after this call.  It is likely to be made
   * inaccurate by any external I/O operations including those made
   * on the system outside of this virtual machine.  This method
   * makes no guarantee that write operations to this file system
   * will succeed.
   *
   * @return  The number of unallocated bytes on the partition or `0L`
   *          if the abstract pathname does not name a partition.  This
   *          value will be less than or equal to the total file system size
   *          returned by {@link #getTotalSpace}.
   *
   * @throws  SecurityException
   *          If a security manager has been installed and it denies
   *          {@link RuntimePermission}`("getFileSystemAttributes")`
   *          or its {@link SecurityManager#checkRead(String)} method denies
   *          read access to the file named by this abstract pathname
   *
   * @since  1.6
  */
  getFreeSpace(): number;
  /**
   * Returns the number of bytes available to this virtual machine on the
   * partition named by this abstract pathname.  When
   * possible, this method checks for write permissions and other operating
   * system restrictions and will therefore usually provide a more accurate
   * estimate of how much new data can actually be written than {@link
   * #getFreeSpace}.
   *
   *  The returned number of available bytes is a hint, but not a
   * guarantee, that it is possible to use most or any of these bytes.  The
   * number of unallocated bytes is most likely to be accurate immediately
   * after this call.  It is likely to be made inaccurate by any external
   * I/O operations including those made on the system outside of this
   * virtual machine.  This method makes no guarantee that write operations
   * to this file system will succeed.
   *
   * @return  The number of available bytes on the partition or `0L`
   *          if the abstract pathname does not name a partition.  On
   *          systems where this information is not available, this method
   *          will be equivalent to a call to {@link #getFreeSpace}.
   *
   * @throws  SecurityException
   *          If a security manager has been installed and it denies
   *          {@link RuntimePermission}`("getFileSystemAttributes")`
   *          or its {@link SecurityManager#checkRead(String)} method denies
   *          read access to the file named by this abstract pathname
   *
   * @since  1.6
  */
  getUsableSpace(): number;
}
export class PrintWriter {
  /**
   * Flushes the stream.
   * @see #checkError()
  */
  flush(): void;
  /**
   * Writes a single character.
   * @param c int specifying a character to be written.
  */
  write(c: number): void;
  /**
   * Writes A Portion of an array of characters.
   * @param buf Array of characters
   * @param off Offset from which to start writing characters
   * @param len Number of characters to write
   *
   * @throws  IndexOutOfBoundsException
   *          If the values of the `off` and `len` parameters
   *          cause the corresponding method of the underlying `Writer`
   *          to throw an `IndexOutOfBoundsException`
  */
  write(buf: string[], off: number, len: number): void;
  /**
   * Writes an array of characters.  This method cannot be inherited from the
   * Writer class because it must suppress I/O exceptions.
   * @param buf Array of characters to be written
  */
  write(buf: string[]): void;
  /**
   * Writes a portion of a string.
   * @param s A String
   * @param off Offset from which to start writing characters
   * @param len Number of characters to write
   *
   * @throws  IndexOutOfBoundsException
   *          If the values of the `off` and `len` parameters
   *          cause the corresponding method of the underlying `Writer`
   *          to throw an `IndexOutOfBoundsException`
  */
  write(s: string, off: number, len: number): void;
  /**
   * Writes a string.  This method cannot be inherited from the Writer class
   * because it must suppress I/O exceptions.
   * @param s String to be written
  */
  write(s: string): void;
  /**
   * Prints a boolean value.  The string produced by {@link
   * java.lang.String#valueOf(boolean)} is translated into bytes
   * according to the platform's default character encoding, and these bytes
   * are written in exactly the manner of the {@link
   * #write(int)} method.
   *
   * @param      b   The `boolean` to be printed
  */
  print(b: boolean): void;
  /**
   * Prints a character.  The character is translated into one or more bytes
   * according to the platform's default character encoding, and these bytes
   * are written in exactly the manner of the {@link
   * #write(int)} method.
   *
   * @param      c   The `char` to be printed
  */
  print(c: string): void;
  /**
   * Prints an integer.  The string produced by {@link
   * java.lang.String#valueOf(int)} is translated into bytes according
   * to the platform's default character encoding, and these bytes are
   * written in exactly the manner of the {@link #write(int)}
   * method.
   *
   * @param      i   The `int` to be printed
   * @see        java.lang.Integer#toString(int)
  */
  print(i: number): void;
  /**
   * Prints an array of characters.  The characters are converted into bytes
   * according to the platform's default character encoding, and these bytes
   * are written in exactly the manner of the {@link #write(int)}
   * method.
   *
   * @param      s   The array of chars to be printed
   *
   * @throws  NullPointerException  If `s` is `null`
  */
  print(s: string[]): void;
  /**
   * Prints an object.  The string produced by the {@link
   * java.lang.String#valueOf(Object)} method is translated into bytes
   * according to the platform's default character encoding, and these bytes
   * are written in exactly the manner of the {@link #write(int)}
   * method.
   *
   * @param      obj   The `Object` to be printed
   * @see        java.lang.Object#toString()
  */
  print(obj: any): void;
  /**
   * Terminates the current line by writing the line separator string.  The
   * line separator string is defined by the system property
   * `line.separator`, and is not necessarily a single newline
   * character (`'\n'`).
  */
  println(): void;
  /**
   * Prints a boolean value and then terminates the line.  This method behaves
   * as though it invokes {@link #print(boolean)} and then
   * {@link #println()}.
   *
   * @param x the `boolean` value to be printed
  */
  println(x: boolean): void;
  /**
   * Prints a character and then terminates the line.  This method behaves as
   * though it invokes {@link #print(char)} and then {@link
   * #println()}.
   *
   * @param x the `char` value to be printed
  */
  println(x: string): void;
  /**
   * Prints an integer and then terminates the line.  This method behaves as
   * though it invokes {@link #print(int)} and then {@link
   * #println()}.
   *
   * @param x the `int` value to be printed
  */
  println(x: number): void;
  /**
   * Prints an array of characters and then terminates the line.  This method
   * behaves as though it invokes {@link #print(char[])} and then
   * {@link #println()}.
   *
   * @param x the array of `char` values to be printed
  */
  println(x: string[]): void;
  /**
   * Prints an Object and then terminates the line.  This method calls
   * at first String.valueOf(x) to get the printed object's string value,
   * then behaves as
   * though it invokes {@link #print(String)} and then
   * {@link #println()}.
   *
   * @param x  The `Object` to be printed.
  */
  println(x: any): void;
  /**
   * A convenience method to write a formatted string to this writer using
   * the specified format string and arguments.  If automatic flushing is
   * enabled, calls to this method will flush the output buffer.
   *
   *  An invocation of this method of the form
   * `out.printf(format, args)`
   * behaves in exactly the same way as the invocation
   *
   * {@code
   *     out.format(format, args)
   * }
   *
   * @param  format
   *         A format string as described in Format string syntax.
   *
   * @param  args
   *         Arguments referenced by the format specifiers in the format
   *         string.  If there are more arguments than format specifiers, the
   *         extra arguments are ignored.  The number of arguments is
   *         variable and may be zero.  The maximum number of arguments is
   *         limited by the maximum dimension of a Java array as defined by
   *         The Java™ Virtual Machine Specification.
   *         The behaviour on a
   *         `null` argument depends on the conversion.
   *
   * @throws  java.util.IllegalFormatException
   *          If a format string contains an illegal syntax, a format
   *          specifier that is incompatible with the given arguments,
   *          insufficient arguments given the format string, or other
   *          illegal conditions.  For specification of all possible
   *          formatting errors, see the Details section of the
   *          formatter class specification.
   *
   * @throws  NullPointerException
   *          If the `format` is `null`
   *
   * @return  This writer
   *
   * @since  1.5
  */
  printf(format: string, ...args: any[]): PrintWriter;
  /**
   * A convenience method to write a formatted string to this writer using
   * the specified format string and arguments.  If automatic flushing is
   * enabled, calls to this method will flush the output buffer.
   *
   *  An invocation of this method of the form
   * `out.printf(l, format, args)`
   * behaves in exactly the same way as the invocation
   *
   * {@code
   *     out.format(l, format, args)
   * }
   *
   * @param  l
   *         The {@linkplain java.util.Locale locale} to apply during
   *         formatting.  If `l` is `null` then no localization
   *         is applied.
   *
   * @param  format
   *         A format string as described in Format string syntax.
   *
   * @param  args
   *         Arguments referenced by the format specifiers in the format
   *         string.  If there are more arguments than format specifiers, the
   *         extra arguments are ignored.  The number of arguments is
   *         variable and may be zero.  The maximum number of arguments is
   *         limited by the maximum dimension of a Java array as defined by
   *         The Java™ Virtual Machine Specification.
   *         The behaviour on a
   *         `null` argument depends on the conversion.
   *
   * @throws  java.util.IllegalFormatException
   *          If a format string contains an illegal syntax, a format
   *          specifier that is incompatible with the given arguments,
   *          insufficient arguments given the format string, or other
   *          illegal conditions.  For specification of all possible
   *          formatting errors, see the Details section of the
   *          formatter class specification.
   *
   * @throws  NullPointerException
   *          If the `format` is `null`
   *
   * @return  This writer
   *
   * @since  1.5
  */
  printf(l: Locale, format: string, ...args: any[]): PrintWriter;
  /**
   * Writes a formatted string to this writer using the specified format
   * string and arguments.  If automatic flushing is enabled, calls to this
   * method will flush the output buffer.
   *
   *  The locale always used is the one returned by {@link
   * java.util.Locale#getDefault() Locale.getDefault()}, regardless of any
   * previous invocations of other formatting methods on this object.
   *
   * @param  format
   *         A format string as described in Format string syntax.
   *
   * @param  args
   *         Arguments referenced by the format specifiers in the format
   *         string.  If there are more arguments than format specifiers, the
   *         extra arguments are ignored.  The number of arguments is
   *         variable and may be zero.  The maximum number of arguments is
   *         limited by the maximum dimension of a Java array as defined by
   *         The Java™ Virtual Machine Specification.
   *         The behaviour on a
   *         `null` argument depends on the conversion.
   *
   * @throws  java.util.IllegalFormatException
   *          If a format string contains an illegal syntax, a format
   *          specifier that is incompatible with the given arguments,
   *          insufficient arguments given the format string, or other
   *          illegal conditions.  For specification of all possible
   *          formatting errors, see the Details section of the
   *          Formatter class specification.
   *
   * @throws  NullPointerException
   *          If the `format` is `null`
   *
   * @return  This writer
   *
   * @since  1.5
  */
  format(format: string, ...args: any[]): PrintWriter;
  /**
   * Writes a formatted string to this writer using the specified format
   * string and arguments.  If automatic flushing is enabled, calls to this
   * method will flush the output buffer.
   *
   * @param  l
   *         The {@linkplain java.util.Locale locale} to apply during
   *         formatting.  If `l` is `null` then no localization
   *         is applied.
   *
   * @param  format
   *         A format string as described in Format string syntax.
   *
   * @param  args
   *         Arguments referenced by the format specifiers in the format
   *         string.  If there are more arguments than format specifiers, the
   *         extra arguments are ignored.  The number of arguments is
   *         variable and may be zero.  The maximum number of arguments is
   *         limited by the maximum dimension of a Java array as defined by
   *         The Java™ Virtual Machine Specification.
   *         The behaviour on a
   *         `null` argument depends on the conversion.
   *
   * @throws  java.util.IllegalFormatException
   *          If a format string contains an illegal syntax, a format
   *          specifier that is incompatible with the given arguments,
   *          insufficient arguments given the format string, or other
   *          illegal conditions.  For specification of all possible
   *          formatting errors, see the Details section of the
   *          formatter class specification.
   *
   * @throws  NullPointerException
   *          If the `format` is `null`
   *
   * @return  This writer
   *
   * @since  1.5
  */
  format(l: Locale, format: string, ...args: any[]): PrintWriter;
}

}
