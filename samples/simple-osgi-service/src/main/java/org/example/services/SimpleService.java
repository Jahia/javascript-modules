package org.example.services;

import java.util.List;

/**
 * This interface defines the SimpleService contract, and it can be used
 * in JavaScript Modules to refere to "SimpleServiceImpl" methods.
 */
public interface SimpleService {
    String sayHello(String name);
    List<Integer> sortNumbers(List<Integer> list);
}
