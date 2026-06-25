export const APPLY_TEMPLATE_TOOL = {
  name: "apply_template_html",
  description:
    "Apply the complete updated template.html HTML. Must include exactly one {{content}} placeholder. Use this tool to write HTML changes — do not paste full HTML in chat messages.",
  input_schema: {
    type: "object",
    properties: {
      html: {
        type: "string",
        description:
          "The complete HTML document for template.html including exactly one {{content}} placeholder.",
      },
    },
    required: ["html"],
  },
};
