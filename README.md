
# alfred-notion-task  
  
A workflow for adding a task to Notion's task database quickly.  
When adding a new task, you can specify the current date or a relation that is linked to another database.
  
![preview](./docs/Sep-25-2024%2016-39-08.gif)
  
> [!CAUTION]  
> The specific property names of Notion Database are my own, so please adapt them to your use case if you need.  

Here is my Notion database schema:  

```mermaid  
erDiagram
    TASK_DATABASE {
        title Task
        date Date
        status Status
        relation Project
    }
    
    PROJECT_DATABASE {
        title Project_Name
        date Date
        select Type
        status Status
    }

    TASK_DATABASE ||--o{ PROJECT_DATABASE: Project  
```
  