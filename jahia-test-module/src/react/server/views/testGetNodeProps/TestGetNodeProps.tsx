import { jahiaComponent } from "@jahia/javascript-modules-library";
import { JCRNodeWrapper } from "org.jahia.services.content";

jahiaComponent(
  {
    nodeType: "javascriptExample:testGetNodeProps",
    name: "default",
    displayName: "test getNodeProps",
    componentType: "view",
  },
  ({
    // single value props"
    propNotSet,
    propNotExists,
    smallText,
    textarea,
    choicelist,
    long,
    double,
    boolean,
    weakreference,
    bigtext,
    date,
    decimal,
    uri,
    name,
    path,
    // multiple value props:
    multipleSmallText,
    multipleTextarea,
    multipleChoicelist,
    multipleLong,
    multipleDouble,
    multipleBoolean,
    multipleWeakreference,
    multipleBigtext,
    multipleDate,
    multipleDecimal,
    multipleUri,
    multipleName,
    multiplePath,
  }: {
    propNotSet: string;
    propNotExists: string;
    smallText: string;
    textarea: string;
    choicelist: string;
    long: number;
    double: number;
    boolean: boolean;
    weakreference: JCRNodeWrapper;
    bigtext: string;
    date: Date;
    decimal: number;
    uri: string;
    name: string;
    path: string;
    // multiple value props:
    multipleSmallText: string[];
    multipleTextarea: string[];
    multipleChoicelist: string[];
    multipleLong: number[];
    multipleDouble: number[];
    multipleBoolean: boolean[];
    multipleWeakreference: JCRNodeWrapper[];
    multipleBigtext: string[];
    multipleDate: Date[];
    multipleDecimal: number[];
    multipleUri: string[];
    multipleName: string[];
    multiplePath: string[];
  }) => {
    const printMultiValuedProp = (
      selector: string,
      values: string[] | number[] | boolean[] | Date[],
      richText = false,
    ) => {
      return (
        values &&
        values.map(function (value, i) {
          if (richText) {
            return (
              <div
                key={value.toString()}
                data-testid={`${selector}_${i + 1}`}
                dangerouslySetInnerHTML={{
                  __html: value,
                }}
              />
            );
          } else {
            return (
              <div key={value.toString()} data-testid={`${selector}_${i + 1}`}>
                {value.toString()}
              </div>
            );
          }
        })
      );
    };
    const printMultiValuedRefsProp = (selector: string, values: JCRNodeWrapper[]) => {
      return (
        values &&
        values.map(function (value, i) {
          return (
            <div key={value.getPath()} data-testid={`${selector}_${i + 1}`}>
              {value.getPath()}
            </div>
          );
        })
      );
    };

    return (
      <>
        <h3>getNodeProps usages (single)</h3>
        <div data-testid="getNodeProps_smallText">{smallText}</div>
        <div data-testid="getNodeProps_textarea">{textarea}</div>
        <div data-testid="getNodeProps_choicelist">{choicelist}</div>
        <div data-testid="getNodeProps_long">{long}</div>
        <div data-testid="getNodeProps_double">{double}</div>
        <div data-testid="getNodeProps_boolean">{boolean.toString()}</div>
        <div data-testid="getNodeProps_weakreference">{weakreference.getPath()}</div>
        <div
          data-testid="getNodeProps_bigtext"
          dangerouslySetInnerHTML={{
            __html: bigtext,
          }}
        />
        <div data-testid="getNodeProps_date">{date.toString()}</div>
        <div data-testid="getNodeProps_decimal">{decimal}</div>
        <div data-testid="getNodeProps_uri">{uri}</div>
        <div data-testid="getNodeProps_name">{name}</div>
        <div data-testid="getNodeProps_path">{path}</div>

        <h3>getNodeProps usages (multiple)</h3>
        <div data-testid="getNodeProps_multipleSmallText">
          {printMultiValuedProp("getNodeProps_multipleSmallText", multipleSmallText)}
        </div>
        <div data-testid="getNodeProps_multipleTextarea">
          {printMultiValuedProp("getNodeProps_multipleTextarea", multipleTextarea)}
        </div>
        <div data-testid="getNodeProps_multipleChoicelist">
          {printMultiValuedProp("getNodeProps_multipleChoicelist", multipleChoicelist)}
        </div>
        <div data-testid="getNodeProps_multipleLong">
          {printMultiValuedProp("getNodeProps_multipleLong", multipleLong)}
        </div>
        <div data-testid="getNodeProps_multipleDouble">
          {printMultiValuedProp("getNodeProps_multipleDouble", multipleDouble)}
        </div>
        <div data-testid="getNodeProps_multipleBoolean">
          {printMultiValuedProp("getNodeProps_multipleBoolean", multipleBoolean)}
        </div>
        <div data-testid="getNodeProps_multipleWeakreference">
          {printMultiValuedRefsProp("getNodeProps_multipleWeakreference", multipleWeakreference)}
        </div>
        <div data-testid="getNodeProps_multipleBigtext">
          {printMultiValuedProp("getNodeProps_multipleBigtext", multipleBigtext, true)}
        </div>
        <div data-testid="getNodeProps_multipleDate">
          {printMultiValuedProp("getNodeProps_multipleDate", multipleDate)}
        </div>
        <div data-testid="getNodeProps_multipleDecimal">
          {printMultiValuedProp("getNodeProps_multipleDecimal", multipleDecimal)}
        </div>
        <div data-testid="getNodeProps_multipleUri">
          {printMultiValuedProp("getNodeProps_multipleUri", multipleUri)}
        </div>
        <div data-testid="getNodeProps_multipleName">
          {printMultiValuedProp("getNodeProps_multipleName", multipleName)}
        </div>
        <div data-testid="getNodeProps_multiplePath">
          {printMultiValuedProp("getNodeProps_multiplePath", multiplePath)}
        </div>

        <h3>getNodeProps usages (typing and safety tests)</h3>
        <div data-testid="getNodeProps_propNotSet">{propNotSet}</div>
        <div data-testid="getNodeProps_propNotExists">{propNotExists}</div>
        <div data-testid="getNodeProps_checkBooleanType">
          {(typeof boolean === "boolean").toString()}
        </div>
        <div data-testid="getNodeProps_checkLongType">{(typeof long === "number").toString()}</div>
        <div data-testid="getNodeProps_checkDoubleType">
          {(typeof double === "number").toString()}
        </div>
      </>
    );
  },
);
