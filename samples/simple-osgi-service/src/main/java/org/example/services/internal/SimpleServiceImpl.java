package org.example.services.internal;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.example.services.SimpleService;
import org.osgi.service.component.annotations.Component;


@Component(service = SimpleService.class, configurationPid = "org.example.services.simple")
public class SimpleServiceImpl implements SimpleService {
    /** Configurable in org.example.services.simple.cfg */
    private String greeting = "Hello";
    public void activate(Map<String, ?> props) {
        if (props.containsKey("greeting")) {
            greeting = (String) props.get("greeting");
        }
    }

    @Override
    public String sayHello(String name) {
        return greeting + " " + name + "!";
    }

    @Override
    public List<Integer> sortNumbers(List<Integer> list) {
        List<Integer> sortedList = new ArrayList<>(list);
        sortedList.sort(Integer::compareTo);
        return sortedList;
    }
}
