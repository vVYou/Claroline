<?php

namespace Claroline\ForumBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;
use Claroline\ForumBundle\Form\SubjectType;
use Claroline\ForumBundle\Entity\Forum;
use Claroline\ForumBundle\Entity\Message;
use Claroline\ForumBundle\Entity\Subject;


/**
 * ForumController
 */
class ForumController extends Controller
{
    public function forumSubjectCreationAction($forumId)
    {
        $formSubject = $this->get('form.factory')->create(new SubjectType());

        return $this->render(
            'ClarolineForumBundle::subject_form.html.twig', array('form' => $formSubject->createView(), 'forumId' => $forumId)
        );
    }

    public function createSubjectAction($forumId)
    {
        $request = $this->get('request');
        $form = $this->get('form.factory')->create(new SubjectType());
        $form->bindRequest($request);
        $em = $this->getDoctrine()->getEntityManager();
        $user = $this->get('security.context')->getToken()->getUser();
        $title = $form['title']->getData();
        $content = $form['content']->getData();
        $subjectType = $em->getRepository('Claroline\CoreBundle\Entity\Resource\ResourceType')->findOneBy(array('type' => 'Subject'));
        $messageType = $em->getRepository('Claroline\CoreBundle\Entity\Resource\ResourceType')->findOneBy(array('type' => 'Message'));
        $forum = $em->getRepository('Claroline\ForumBundle\Entity\Forum')->find($forumId);
        $message = new Message();
        $subject = new Subject();
        $message->setResourceType($messageType);
        $subject->setResourceType($subjectType);
        $subject->setTitle($title);
        $subject->setUser($user);
        $message->setContent($content);
        $subject->setForum($forum);
        $message->setSubject($subject);
        $message->setUser($user);
        $em->persist($message);
        $em->persist($subject);

        $em->flush();

        return new Response("hello world this is created");
    }

    public function showMessagesAction($subjectId)
    {
        $em = $this->getDoctrine()->getEntityManager();
        $subject = $em->getRepository('Claroline\ForumBundle\Entity\Subject')->find($subjectId);

        return $this->render(
            'ClarolineForumBundle::messages.html.twig', array('subject' => $subject)
        );
    }

    //public function addMessageAction($subje)



}
